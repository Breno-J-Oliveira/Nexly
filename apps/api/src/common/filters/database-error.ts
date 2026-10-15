import { Prisma } from '@prisma/client';

/** Mensagens publicas fixas: metadados e argumentos SQL nunca chegam ao cliente. */
export function databaseError(
  error: unknown,
): { status: number; code: string; message: string } | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (error.code) {
    case 'P2002':
      return {
        status: 409,
        code: 'DUPLICATE_RECORD',
        message: 'Já existe um registro com esses dados.',
      };
    case 'P2003':
      return {
        status: 409,
        code: 'RELATED_RECORD_CONFLICT',
        message:
          'A operação depende de um registro relacionado. Atualize os dados e tente novamente.',
      };
    case 'P2025':
      return { status: 404, code: 'RECORD_NOT_FOUND', message: 'Registro não encontrado.' };
    case 'P2034':
      return {
        status: 409,
        code: 'CONCURRENT_UPDATE',
        message: 'Os dados foram alterados ao mesmo tempo. Atualize a página e tente novamente.',
      };
    default:
      return null;
  }
}
