import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { EvolutionProvider } from './providers/evolution.provider';
import { normalizarTelefoneWhatsapp } from './whatsapp-phone';

/* ------------------------------------------------------------------ */
/*  WhatsApp Service — envia lembretes de agendamento e campanhas      */
/*                                                                     */
/*  Provider pluggable:                                                */
/*   - Evolution API (on-premise, WhatsApp Baileys)                    */
/*   - Twilio / Meta Cloud API (oficial)                               */
/*   - test (simulação sem entrega ou dados nos logs)                             */
/*                                                                     */
/*  Config via env: WHATSAPP_PROVIDER, EVOLUTION_API_URL,             */
/*  EVOLUTION_API_KEY, EVOLUTION_INSTANCE                              */
/* ------------------------------------------------------------------ */

interface SendMessageParams {
  phone: string;
  message: string;
}

const TEMPLATE_PADRAO =
  'Olá {{nome}}! Lembrando do seu agendamento amanhã às {{hora}} com {{profissional}} para {{servico}}. Qualquer dúvida, entre em contato.';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly provider: string;
  private readonly mode: 'ready' | 'simulation' | 'disabled' | 'unconfigured';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionProvider,
  ) {
    this.provider = this.config.get<string>('WHATSAPP_PROVIDER', 'disabled');
    const required: Record<string, string[]> = {
      evolution: ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY', 'EVOLUTION_INSTANCE'],
      twilio: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
      meta: ['META_PHONE_ID', 'META_API_KEY'],
    };
    this.mode =
      this.provider === 'disabled'
        ? 'disabled'
        : this.provider === 'test'
          ? 'simulation'
          : required[this.provider]?.every((key) => this.config.get<string>(key, '').trim())
            ? 'ready'
            : 'unconfigured';
    if (this.mode !== 'ready') this.logger.warn(`WhatsApp: ${this.mode}`);
  }

  isEnabled(): boolean {
    return this.mode === 'ready';
  }

  /** Configuração disponível; não comprova conexão nem entrega ao destinatário. */
  getStatus() {
    return { provider: this.provider, enabled: this.isEnabled(), mode: this.mode };
  }

  /* ── Send a single message ── */
  async send({ phone, message }: SendMessageParams): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const number = normalizarTelefoneWhatsapp(phone);
    if (!number || !message.trim() || message.length > 1000) return false;
    try {
      if (this.provider === 'evolution') {
        await this.evolution.sendMessage(number, message);
        return true;
      }
      if (this.provider === 'twilio') return await this.sendViaTwilio(`+${number}`, message);
      if (this.provider === 'meta') return await this.sendViaMeta(number, message);
      return false;
    } catch {
      // Respostas de provedores podem conter telefone, mensagem ou credenciais.
      this.logger.error('Falha ao solicitar envio de WhatsApp ao provedor');
      return false;
    }
  }

  /* ── Send appointment reminder ── */
  async sendAppointmentReminder(params: {
    phone: string;
    clientName: string;
    professionalName: string;
    serviceName: string;
    dateTime: string;
  }): Promise<boolean> {
    const date = new Date(params.dateTime);
    const formatted = `
\u{1F4C5} *${date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}*
\u{23F0} \u00E0s ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
\u{1F487} ${params.professionalName}
\u{2728} ${params.serviceName}`;

    const message = `Ol\u00E1 *${params.clientName}*! \u{1F44B}

Seu agendamento na Nexly est\u00E1 confirmado:\n${formatted}

Qualquer d\u00FAvida, responda esta mensagem. At\u00E9 l\u00E1! \u{1F60A}`;

    return this.send({ phone: params.phone, message });
  }

  /* ── Provider implementations ── */
  private async sendViaTwilio(phone: string, message: string): Promise<boolean> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID', '');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN', '');
    const from = this.config.get<string>('TWILIO_PHONE_NUMBER', '');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          To: `whatsapp:${phone}`,
          From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
          Body: message,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) throw new Error(`Twilio: ${res.status}`);
    return true;
  }

  private async sendViaMeta(phone: string, message: string): Promise<boolean> {
    const phoneId = this.config.get<string>('META_PHONE_ID', '');
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.get<string>('META_API_KEY', '')}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace(/\D/g, ''),
        type: 'text',
        text: { body: message },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Meta API: ${res.status}`);
    return true;
  }

  /* ── Schedule daily reminders (called via cron) ── */
  async sendDailyReminders(): Promise<{ sent: number; failed: number }> {
    if (!this.isEnabled()) return { sent: 0, failed: 0 };
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const inicio = new Date(amanha);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(amanha);
    fim.setHours(23, 59, 59, 999);

    // Roda fora de request → sem tenant context → consulta todas as empresas.
    const agendamentos = await this.prisma.client.agendamento.findMany({
      where: {
        dataHora: { gte: inicio, lte: fim },
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
      },
      include: {
        cliente: { select: { nome: true, telefone: true } },
        profissional: { select: { nome: true } },
        servico: { select: { nome: true } },
      },
    });

    const empresas = await this.prisma.client.empresa.findMany({
      where: { lembretesAtivos: true },
      select: { id: true, templateLembrete: true },
    });
    const empresasMap = new Map(empresas.map((e) => [e.id, e.templateLembrete]));

    let sent = 0;
    let failed = 0;
    for (const a of agendamentos) {
      const template = empresasMap.get(a.empresaId);
      if (template === undefined) continue; // lembretes desativados para esta empresa
      if (!a.cliente.telefone) {
        failed++;
        continue;
      }

      const hora = a.dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const message = (template || TEMPLATE_PADRAO)
        .replace(/\{\{nome\}\}/g, a.cliente.nome)
        .replace(/\{\{hora\}\}/g, hora)
        .replace(/\{\{profissional\}\}/g, a.profissional.nome)
        .replace(/\{\{servico\}\}/g, a.servico.nome);

      const ok = await this.send({ phone: a.cliente.telefone, message });
      if (ok) sent++;
      else failed++;
    }

    this.logger.log(`Lembretes diários: ${sent} enviados, ${failed} falhas`);
    return { sent, failed };
  }
}
