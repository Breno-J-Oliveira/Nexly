import { Injectable } from '@nestjs/common';
import { Plano, Prisma, StatusAgendamento } from '@prisma/client';
import { StripeGateway } from '../assinaturas/stripe.gateway';
import { PrismaService } from '../database/prisma.service';
import { tenantStorage } from '../database/tenant-context';
import { RedisService } from '../redis/redis.service';
import { version } from '../../package.json';

const PERIOD_DAYS = 30;
const DAY_MS = 86_400_000;
const PAGE_SIZE = 25;
const BILLING_ATTENTION = ['past_due', 'unpaid', 'incomplete', 'paused'];
const QUEUE_STATES = ['PENDENTE', 'PROCESSANDO', 'FALHOU'];
export const COMPANY_SUBSCRIPTIONS = ['active', 'attention', 'none', 'other'] as const;
export const COMPANY_SORTS = ['recent', 'oldest', 'name_asc', 'name_desc'] as const;
export type CompanySubscription = (typeof COMPANY_SUBSCRIPTIONS)[number];
export type CompanySort = (typeof COMPANY_SORTS)[number];

const companyOrder: Record<CompanySort, Prisma.EmpresaOrderByWithRelationInput[]> = {
  recent: [{ createdAt: 'desc' }, { id: 'desc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  name_asc: [{ nome: 'asc' }, { id: 'asc' }],
  name_desc: [{ nome: 'desc' }, { id: 'desc' }],
};

const companySelect = {
  id: true,
  nome: true,
  segmento: true,
  plano: true,
  createdAt: true,
  assinatura: { select: { ambiente: true, status: true } },
} satisfies Prisma.EmpresaSelect;

type CompanyRow = Prisma.EmpresaGetPayload<{ select: typeof companySelect }>;

@Injectable()
export class PlatformOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: StripeGateway,
    private readonly redis: RedisService,
  ) {}

  overview(now = new Date()) {
    // Apenas este serviço do console consulta agregados globais. O guard do console
    // é validado antes que o controlador possa chamar estas consultas.
    return tenantStorage.exit(async () => {
      const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const startTime = today - (PERIOD_DAYS - 1) * DAY_MS;
      const start = new Date(startTime);
      const end = new Date(today + DAY_MS);
      const db = this.prisma.client;
      const billingScope = { ambiente: this.billing.mode };
      const [planRows, managedUsers, appointments, active, attention, signupRows, recent] =
        await Promise.all([
          db.empresa.groupBy({ by: ['plano'], _count: { _all: true } }),
          db.usuario.count({ where: { ativo: true } }),
          db.agendamento.count({
            where: {
              dataHora: { gte: start, lt: end },
              status: { not: StatusAgendamento.CANCELADO },
            },
          }),
          db.assinatura.count({ where: { ...billingScope, status: 'active' } }),
          db.assinatura.count({ where: { ...billingScope, status: { in: BILLING_ATTENTION } } }),
          db.$queryRaw<Array<{ date: string; count: bigint }>>`
            SELECT to_char(created_at, 'YYYY-MM-DD') AS date, count(*) AS count
            FROM empresas
            WHERE created_at >= ${start} AND created_at < ${end}
            GROUP BY 1
          `,
          db.empresa.findMany({
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 5,
            select: companySelect,
          }),
        ]);

      const signupCounts = new Map(signupRows.map(({ date, count }) => [date, Number(count)]));
      const signups = Array.from({ length: PERIOD_DAYS }, (_, i) => {
        const date = new Date(startTime + i * DAY_MS).toISOString().slice(0, 10);
        return { date, count: signupCounts.get(date) ?? 0 };
      });
      const planCounts = new Map(planRows.map((row) => [row.plano, row._count._all]));
      return {
        periodDays: PERIOD_DAYS,
        totals: {
          companies: planRows.reduce((total, row) => total + row._count._all, 0),
          newCompanies: signups.reduce((total, row) => total + row.count, 0),
          activeSubscriptions: active,
          managedUsers,
          appointments,
          nonHealthySubscriptions: attention,
        },
        signups,
        plans: Object.values(Plano).map((plan) => ({ plan, companies: planCounts.get(plan) ?? 0 })),
        billing: { mode: this.billing.mode, available: this.billing.enabled },
        recentCompanies: recent.map((row) => this.company(row)),
      };
    });
  }

  companies({
    page = 1,
    q,
    plan,
    sort = 'recent',
    subscription,
  }: {
    page?: number;
    q?: string;
    plan?: Plano;
    sort?: CompanySort;
    subscription?: CompanySubscription;
  }) {
    return tenantStorage.exit(async () => {
      const query = q?.trim();
      const where: Prisma.EmpresaWhereInput = {
        ...(query ? { nome: { contains: query, mode: 'insensitive' } } : {}),
        ...(plan ? { plano: plan } : {}),
        ...this.subscriptionFilter(subscription),
      };
      const db = this.prisma.client;
      const [total, rows] = await db.$transaction([
        db.empresa.count({ where }),
        db.empresa.findMany({
          where,
          orderBy: companyOrder[sort],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: companySelect,
        }),
      ]);
      return { items: rows.map((row) => this.company(row)), total, page, pageSize: PAGE_SIZE };
    });
  }

  async operations(now = new Date()) {
    return tenantStorage.exit(async () => {
      const db = this.prisma.client;
      const [postgres, redis, queue] = await Promise.all([
        this.check(async () => {
          await db.$queryRaw`SELECT 1`;
          return true;
        }),
        this.check(() => this.redis.ping()),
        Promise.all([
          db.jobDuravel.groupBy({
            by: ['status'],
            where: { status: { in: QUEUE_STATES } },
            _count: { _all: true },
          }),
          db.jobDuravel.count({
            where: { status: 'PENDENTE', executarEm: { lte: now } },
          }),
          db.jobDuravel.groupBy({
            by: ['tipo'],
            where: { status: 'FALHOU' },
            _count: { _all: true },
            orderBy: [{ _count: { tipo: 'desc' } }, { tipo: 'asc' }],
            take: 8,
          }),
        ])
          .then(([states, due, failedByType]) => {
            const count = (status: string) =>
              states.find((row) => row.status === status)?._count._all ?? 0;
            return {
              pending: count('PENDENTE'),
              running: count('PROCESSANDO'),
              failed: count('FALHOU'),
              due,
              failedByType: failedByType.map(({ tipo, _count }) => ({
                type: tipo,
                total: _count._all,
              })),
            };
          })
          .catch(() => null),
      ]);
      const commit = process.env.RAILWAY_GIT_COMMIT_SHA;
      return {
        checkedAt: now,
        postgres,
        redis,
        queue,
        billing: { mode: this.billing.mode, available: this.billing.enabled },
        release: {
          version,
          commit: commit && /^[a-f0-9]{40}$/i.test(commit) ? commit : null,
          uptimeSeconds: Math.floor(process.uptime()),
        },
      };
    });
  }

  private async check(run: () => Promise<boolean>) {
    const started = performance.now();
    const ok = await run().catch(() => false);
    return { ok, latencyMs: ok ? Math.round(performance.now() - started) : null };
  }

  private subscriptionFilter(subscription?: CompanySubscription): Prisma.EmpresaWhereInput {
    if (!subscription) return {};
    const ambiente = this.billing.mode;
    if (subscription === 'none') {
      return {
        OR: [
          { assinatura: { is: null } },
          { assinatura: { is: { ambiente: { not: ambiente } } } },
          { assinatura: { is: { ambiente, status: 'none' } } },
        ],
      };
    }
    const status: Prisma.StringFilter | string = {
      active: 'active',
      attention: { in: BILLING_ATTENTION },
      other: { notIn: ['active', 'none', ...BILLING_ATTENTION] },
    }[subscription];
    return { assinatura: { is: { ambiente, status } } };
  }

  private company(row: CompanyRow) {
    return {
      id: row.id,
      name: row.nome,
      segment: row.segmento,
      plan: row.plano,
      createdAt: row.createdAt,
      subscriptionStatus:
        row.assinatura?.ambiente === this.billing.mode ? row.assinatura.status : 'none',
    };
  }
}
