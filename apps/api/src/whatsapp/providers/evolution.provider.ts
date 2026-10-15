import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizarTelefoneWhatsapp } from '../whatsapp-phone';

export interface WhatsAppMessageProvider {
  sendMessage(phone: string, message: string): Promise<void>;
}

/**
 * Evolution API — servidor WhatsApp Baileys self-hosted (open-source).
 *
 * Endpoint: POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}
 * Headers:  apikey: EVOLUTION_API_KEY
 * Body:     { number, text, delay }
 */
@Injectable()
export class EvolutionProvider implements WhatsAppMessageProvider {
  constructor(private readonly config: ConfigService) {}

  async sendMessage(phone: string, message: string): Promise<void> {
    const apiUrl = this.config.get<string>('EVOLUTION_API_URL', '');
    const apiKey = this.config.get<string>('EVOLUTION_API_KEY', '');
    const instance = this.config.get<string>('EVOLUTION_INSTANCE', 'nexly');

    if (!apiUrl) throw new Error('EVOLUTION_API_URL não configurado');

    const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({
        number: EvolutionProvider.formatPhone(phone),
        text: message,
        delay: 1200,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`Evolution API: ${res.status}`);
  }

  /** Remove não-dígitos e garante o DDI 55 quando ausente. */
  static formatPhone(phone: string): string {
    const number = normalizarTelefoneWhatsapp(phone);
    if (!number) throw new Error('Telefone inválido');
    return number;
  }
}
