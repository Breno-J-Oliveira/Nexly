import {
  BadRequestException,
  HttpException,
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { RedisService } from '../redis/redis.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RecuperacaoService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly redis: RedisService,
  ) {}
  disponivel() {
    return (
      process.env.EMAIL_PROVIDER === 'resend' &&
      Boolean(process.env.RESEND_API_KEY) &&
      Boolean(process.env.EMAIL_FROM) &&
      /^[a-f\d]{64}$/i.test(process.env.EMAIL_QUEUE_KEY ?? '') &&
      /^https:\/\//.test(process.env.PUBLIC_APP_URL ?? '')
    );
  }
  onModuleInit() {
    this.jobs.register('EMAIL_RECUPERACAO', async (payload, job) => {
      if (!this.disponivel()) throw new Error('Envio desativado');
      const decoded = this.decifrar(payload);
      const recovery = await this.prisma.client.recuperacaoSenha.findUnique({
        where: { tokenHash: decoded.hash },
        include: { usuario: { select: { email: true, ativo: true, empresaId: true } } },
      });
      if (
        !recovery ||
        recovery.usadoEm ||
        recovery.expiresAt <= new Date() ||
        !recovery.usuario.ativo ||
        recovery.usuario.empresaId !== job.empresaId
      )
        return;
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': job.id,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [recovery.usuario.email],
          subject: 'Redefina sua senha do Nexly',
          text: `Recebemos um pedido para alterar sua senha. Use o link em até 30 minutos: ${decoded.url}\nSe não foi você, ignore esta mensagem.`,
        }),
      });
      if (!response.ok) throw new Error('Envio não aceito');
    });
  }
  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private cifrar(data: { hash: string; url: string }) {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', Buffer.from(process.env.EMAIL_QUEUE_KEY!, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
    return {
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex'),
      value: encrypted.toString('hex'),
    };
  }
  private decifrar(payload: Prisma.JsonValue): { hash: string; url: string } {
    const data = payload as { iv: string; tag: string; value: string };
    const cipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(process.env.EMAIL_QUEUE_KEY!, 'hex'),
      Buffer.from(data.iv, 'hex'),
    );
    cipher.setAuthTag(Buffer.from(data.tag, 'hex'));
    return JSON.parse(
      Buffer.concat([cipher.update(Buffer.from(data.value, 'hex')), cipher.final()]).toString(
        'utf8',
      ),
    ) as { hash: string; url: string };
  }
  private validarCota(resultado: Awaited<ReturnType<RedisService['consumeLimit']>>) {
    if (!resultado)
      throw new ServiceUnavailableException(
        'Aguarde. Não foi possível validar a cota de recuperação.',
      );
    if (!resultado.allowed)
      throw new HttpException(
        {
          message: 'Muitas solicitações. Aguarde antes de tentar novamente.',
          retryAfter: resultado.retryAfter,
        },
        429,
      );
  }
  async solicitar(email: string, ip: string) {
    if (!this.disponivel())
      return { disponivel: false, message: 'Recuperação por e-mail indisponível' };
    const limiteIp = await this.redis.consumeLimit(`recovery-ip:${this.hash(ip)}`, 10, 3600);
    this.validarCota(limiteIp);
    const limit = await this.redis.consumeLimit(`recovery:${this.hash(ip + '|' + email)}`, 3, 3600);
    this.validarCota(limit);
    const user = await this.prisma.client.usuario.findUnique({
      where: { email },
      select: { id: true, ativo: true, empresaId: true },
    });
    if (user?.ativo) {
      const token = randomBytes(32).toString('hex'),
        hash = this.hash(token);
      const payload = this.cifrar({
        hash,
        url: `${process.env.PUBLIC_APP_URL!.replace(/\/$/, '')}/redefinir-senha#token=${token}`,
      });
      await this.prisma.client.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM usuarios WHERE id=${user.id} FOR UPDATE`;
        await tx.recuperacaoSenha.updateMany({
          where: { usuarioId: user.id, usadoEm: null },
          data: { usadoEm: new Date() },
        });
        await tx.recuperacaoSenha.create({
          data: { usuarioId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 1800000) },
        });
        await this.jobs.adicionar(
          user.empresaId,
          'EMAIL_RECUPERACAO',
          `recuperacao:${hash}`,
          payload,
          tx as unknown as Prisma.TransactionClient,
        );
      });
    }
    return {
      disponivel: true,
      message: 'Se a conta existir e estiver ativa, enviaremos as instruções de recuperação.',
    };
  }
  async redefinir(token: string, senha: string, ip: string) {
    const limite = await this.redis.consumeLimit(`recovery-reset:${this.hash(ip)}`, 10, 900);
    this.validarCota(limite);
    const hash = this.hash(token);
    const candidato = await this.prisma.client.recuperacaoSenha.findUnique({
      where: { tokenHash: hash },
    });
    if (!candidato || candidato.usadoEm || candidato.expiresAt <= new Date())
      throw new BadRequestException('O link é inválido ou expirou. Solicite outro.');
    const senhaHash = await argon2.hash(senha, { type: argon2.argon2id });
    return this.prisma.client.$transaction(async (tx) => {
      const recovery = await tx.recuperacaoSenha.findUnique({ where: { tokenHash: hash } });
      if (!recovery || recovery.usadoEm || recovery.expiresAt <= new Date())
        throw new BadRequestException('O link é inválido ou expirou. Solicite outro.');
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id=${recovery.usuarioId} FOR UPDATE`;
      const claimed = await tx.recuperacaoSenha.updateMany({
        where: { id: recovery.id, usadoEm: null, expiresAt: { gt: new Date() } },
        data: { usadoEm: new Date() },
      });
      if (!claimed.count)
        throw new BadRequestException('O link é inválido ou expirou. Solicite outro.');
      const updated = await tx.usuario.updateMany({
        where: { id: recovery.usuarioId, ativo: true },
        data: { senhaHash, twoFactorChallengeHash: null, twoFactorChallengeExpiresAt: null },
      });
      if (!updated.count)
        throw new BadRequestException('O link é inválido ou expirou. Solicite outro.');
      await tx.authSession.updateMany({
        where: { usuarioId: recovery.usuarioId },
        data: { revogado: true },
      });
      await tx.refreshToken.updateMany({
        where: { usuarioId: recovery.usuarioId },
        data: { revogado: true },
      });
      await tx.recuperacaoSenha.updateMany({
        where: { usuarioId: recovery.usuarioId, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      return { message: 'Senha alterada. Entre novamente com a nova senha.' };
    });
  }
}
