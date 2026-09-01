import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/* ------------------------------------------------------------------ */
/*  WhatsApp Service — envia lembretes de agendamento e campanhas      */
/*                                                                     */
/*  Provider pluggable:                                                */
/*   - Evolution API (on-premise, WhatsApp Baileys)                    */
/*   - Twilio / Meta Cloud API (oficial)                               */
/*                                                                     */
/*  Config via env: WHATSAPP_PROVIDER, WHATSAPP_API_URL, WHATSAPP_KEY */
/* ------------------------------------------------------------------ */

interface SendMessageParams {
  phone: string;
  message: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly provider: string;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>('WHATSAPP_PROVIDER', 'disabled');
    this.apiUrl = this.config.get<string>('WHATSAPP_API_URL', '');
    this.apiKey = this.config.get<string>('WHATSAPP_API_KEY', '');
    this.enabled = this.provider !== 'disabled';
    if (!this.enabled) {
      this.logger.warn('WhatsApp disabled — set WHATSAPP_PROVIDER to enable');
    }
  }

  isEnabled(): boolean { return this.enabled; }

  /* ── Send a single message ── */
  async send({ phone, message }: SendMessageParams): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      if (this.provider === 'evolution') return this.sendViaEvolution(phone, message);
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
  private async sendViaEvolution(phone: string, message: string): Promise<boolean> {
    const res = await fetch(`${this.apiUrl}/message/sendText/${this.config.get<string>('WHATSAPP_INSTANCE', 'default')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': this.apiKey },
      body: JSON.stringify({ number: phone.replace(/\D/g, ''), text: message }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Evolution API: ${res.status} ${await res.text()}`);
    return true;
  }

  private async sendViaTwilio(phone: string, message: string): Promise<boolean> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID', '');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN', '');
    const from = this.config.get<string>('TWILIO_PHONE_NUMBER', '');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}` },
      body: new URLSearchParams({ To: phone, From: from, Body: message }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Twilio: ${res.status}`);
    return true;
  }

  private async sendViaMeta(phone: string, message: string): Promise<boolean> {
    const phoneId = this.config.get<string>('META_PHONE_ID', '');
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
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
    // Fetches tomorrow's appointments and sends reminders
    // Called by NestJS @Cron or external scheduler
    this.logger.log('Daily reminders: not yet connected to appointment data');
    return { sent: 0, failed: 0 };
  }
}
