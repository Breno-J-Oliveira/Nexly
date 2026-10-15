import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../database/prisma.service';
import { EvolutionProvider } from './providers/evolution.provider';
import { EnviarMensagemDto } from './dto/enviar-mensagem.dto';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

const phone = '(55) 99999-1234';
const message = 'Conteúdo privado de teste';
describe('WhatsApp: configuração, envio e privacidade', () => {
  const evolution = { sendMessage: jest.fn() };
  const prisma = { agendamento: { findMany: jest.fn() } };
  const make = (values: Record<string, string> = {}) =>
    new WhatsAppService(
      new ConfigService(values),
      prisma as unknown as PrismaService,
      evolution as unknown as EvolutionProvider,
    );
  let fetchMock: jest.SpyInstance;
  let errorLog: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    evolution.sendMessage.mockResolvedValue(undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('integração desativada não consulta clientes nem tenta envio', async () => {
    const service = make({ WHATSAPP_PROVIDER: 'disabled' });
    expect(service.getStatus()).toMatchObject({ enabled: false, mode: 'disabled' });
    expect(await service.send({ phone, message })).toBe(false);
    expect(await service.sendDailyReminders()).toEqual({ sent: 0, failed: 0 });
    expect(prisma.agendamento.findMany).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['evolution', 'twilio', 'meta', 'unknown'])(
    'não considera %s conectado sem credenciais',
    async (provider) => {
      const service = make({ WHATSAPP_PROVIDER: provider });
      expect(service.getStatus()).toMatchObject({ enabled: false, mode: 'unconfigured' });
      expect(await service.send({ phone, message })).toBe(false);
      expect(evolution.sendMessage).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it('simulação nunca é reportada como envio real nem registra dados pessoais', async () => {
    const service = make({ WHATSAPP_PROVIDER: 'test' });
    const log = jest.spyOn(Logger.prototype, 'log');
    const controller = new WhatsAppController(service);
    expect(await controller.testSend({ phone, message })).toMatchObject({
      sent: false,
      simulated: true,
    });
    expect(await service.send({ phone, message })).toBe(false);
    expect(log).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('normaliza DDD 55 local sem confundi-lo com o DDI', async () => {
    const service = make({
      WHATSAPP_PROVIDER: 'evolution',
      EVOLUTION_API_URL: 'https://example.test',
      EVOLUTION_API_KEY: 'test-key',
      EVOLUTION_INSTANCE: 'test',
    });
    expect(await service.send({ phone, message })).toBe(true);
    expect(evolution.sendMessage).toHaveBeenCalledWith('5555999991234', message);
    expect(EvolutionProvider.formatPhone('+55 (11) 99999-1234')).toBe('5511999991234');
    expect(await service.send({ phone: '123', message })).toBe(false);
    expect(evolution.sendMessage).toHaveBeenCalledTimes(1);
  });
  it('falha externa retorna false e não expõe o corpo da resposta no log', async () => {
    const service = make({
      WHATSAPP_PROVIDER: 'meta',
      META_PHONE_ID: 'test',
      META_API_KEY: 'test-key',
    });
    fetchMock.mockRejectedValue(new Error(`Segredo do provedor: ${phone} ${message}`));
    expect(await service.send({ phone, message })).toBe(false);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(message);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(phone);
  });
  it('Twilio recebe o destinatário em E.164 e falha sem expor conteúdo', async () => {
    const service = make({
      WHATSAPP_PROVIDER: 'twilio',
      TWILIO_ACCOUNT_SID: 'test',
      TWILIO_AUTH_TOKEN: 'test-key',
      TWILIO_PHONE_NUMBER: 'whatsapp:+5511999991234',
    });
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    expect(await service.send({ phone, message })).toBe(false);
    const body = fetchMock.mock.calls[0][1].body;
    expect(body.get('To')).toBe('whatsapp:+5555999991234');
    expect(body.get('From')).toBe('whatsapp:+5511999991234');
  });
  it('valida telefone e impede conteúdo vazio no endpoint de teste', async () => {
    const valid = plainToInstance(EnviarMensagemDto, { phone: '+55 (11) 99999-1234', message });
    expect(await validate(valid)).toHaveLength(0);
    expect(valid.phone).toBe('5511999991234');
    for (const payload of [
      { phone: '123', message },
      { phone, message: '   ' },
    ]) {
      expect((await validate(plainToInstance(EnviarMensagemDto, payload))).length).toBeGreaterThan(
        0,
      );
    }
  });
});
