import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { EvolutionProvider } from './providers/evolution.provider';

/* ------------------------------------------------------------------ */
/*  WhatsApp Service — envia lembretes de agendamento e campanhas      */
/*                                                                     */
/*  Provider pluggable:                                                */
/*   - Evolution API (on-premise, WhatsApp Baileys)                    */
/*   - Twilio / Meta Cloud API (oficial)                               */
/*   - test (apenas loga, útil para o TCC)                             */
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
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionProvider,
  ) {
    this.provider = this.config.get<string>('WHATSAPP_PROVIDER', 'disabled');
    this.enabled = this.provider !== 'disabled';
    if (!this.enabled) {
      this.logger.warn('WhatsApp disabled — set WHATSAPP_PROVIDER to enable');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Estado da conexão (usado pelo frontend em Configurações). */
  getStatus() {
    return { provider: this.provider, enabled: this.enabled };
  }

  /* ── Send a single message ── */
  async send({ phone, message }: SendMessageParams): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      if (this.provider === 'evolution') {
        await this.evolution.sendMessage(phone, message);
        return true;
      }
      if (this.provider === 'test') {
        this.logger.log(`[whatsapp:test] → ${phone}: ${message}`);
        return true;
      }
      if (this.provider === 'twilio') return this.sendViaTwilio(phone, message);
      if (this.provider === 'meta') return this.sendViaMeta(phone, message);
      this.logger.warn(`Unknown WhatsApp provider: ${this.provider}`);
      return false;
    } catch (err) {
      this.logger.error(`WhatsApp send failed: ${(err as Error).message}`);
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
        body: new URLSearchParams({ To: phone, From: from, Body: message }),
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
    if (!res.ok) throw new Error(`Meta API: ${res.status} ${await res.text()}`);
    return true;
  }

  /* ── Schedule daily reminders (called via cron) ── */
  async sendDailyReminders(): Promise<{ sent: number; failed: number }> {
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
