import { Prisma } from '@prisma/client';
import { getTenantContext } from './tenant-context';
import { applyTenantScope } from './tenant-scope';

/**
 * Prisma Extension que injeta `empresaId` (do AsyncLocalStorage) nas
 * queries dos modelos de negócio. É a "rede de segurança da aplicação"
 * — o RLS do banco é a rede de segurança do banco.
 *
 * Regras de injeção:
 * - `create`/`createMany`/`upsert` → injeta em `data`/`create`.
 * - `findMany`/`findFirst`/`count`/`aggregate`/`groupBy`/`updateMany`/`deleteMany`
 *   → injeta em `where`.
 * - Prisma 5 aceita filtros adicionais em where único: findUnique/update/delete
 *   também são isolados. Tabelas filhas recebem filtro pela relação com o pai.
 * - Auth público e jobs globais sem contexto continuam usando filtros explícitos.
 */
export const tenantExtension = Prisma.defineExtension((client) =>
  client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, model, operation }) {
          const ctx = getTenantContext();
          if (!ctx?.tenantId) {
            return query(args);
          }

          applyTenantScope(model, operation, args, ctx.tenantId);

          return query(args);
        },
      },
    },
  }),
);
