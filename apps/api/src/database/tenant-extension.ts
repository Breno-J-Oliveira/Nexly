import { Prisma } from '@prisma/client';
import { getTenantContext } from './tenant-context';

/**
 * Modelos que possuem `empresaId` e recebem o filtro de tenant
 * automaticamente em todas as operações (leitura e escrita).
 */
const TENANT_MODELS = new Set<string>([
  'Cliente',
  'Profissional',
  'Servico',
  'Agendamento',
  'Produto',
  'MovimentacaoEstoque',
  'Venda',
]);

/**
 * Prisma Extension que injeta `empresaId` (do AsyncLocalStorage) nas
 * queries dos modelos de negócio. É a "rede de segurança da aplicação"
 * — o RLS do banco é a rede de segurança do banco.
 *
 * Regras de injeção:
 * - `create`/`createMany`/`upsert` → injeta em `data`/`create`.
 * - `findMany`/`findFirst`/`count`/`aggregate`/`groupBy`/`updateMany`/`deleteMany`
 *   → injeta em `where`.
 * - `findUnique`/`update`/`delete` usam `where` único e NÃO aceitam campos
 *   extras. Por isso os serviços devem usar `findFirst` (leitura) e
 *   `updateMany`/`deleteMany` (escrita) para manter o isolamento.
 */
export const tenantExtension = Prisma.defineExtension((client) =>
  client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, model, operation }) {
          if (!TENANT_MODELS.has(model as string)) {
            return query(args);
          }

          const ctx = getTenantContext();
          if (!ctx?.tenantId) {
            return query(args);
          }

          const a = args as { data?: object; create?: object; where?: object };

          switch (operation) {
            case 'create':
            case 'createMany':
              a.data = { ...(a.data ?? {}), empresaId: ctx.tenantId };
              break;
            case 'upsert':
              a.create = { ...(a.create ?? {}), empresaId: ctx.tenantId };
              a.where = { ...(a.where ?? {}), empresaId: ctx.tenantId };
              break;
            case 'findUnique':
            case 'update':
            case 'delete':
              // where único — não injeta (serviços usam findFirst/updateMany/deleteMany)
              break;
            default:
              a.where = { ...(a.where ?? {}), empresaId: ctx.tenantId };
              break;
          }

          return query(args);
        },
      },
    },
  }),
);

