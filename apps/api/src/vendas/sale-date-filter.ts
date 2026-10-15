import { BadRequestException } from '@nestjs/common';
import { isISO8601 } from 'class-validator';
import { dateRange } from '../common/validation/date-range';

/** Datas legadas sao dias UTC; limites ISO explicitos preservam o fuso do navegador. */
export function saleDateFilter(
  start?: string,
  end?: string,
): { gte?: Date; lte?: Date } | undefined {
  const parse = (value: string, last: boolean) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const range = dateRange(value, value);
      return last ? range.fim : range.inicio;
    }
    if (
      !isISO8601(value, { strict: true, strictSeparator: true }) ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(value)
    )
      throw new BadRequestException('Informe uma data válida ou horário com fuso');
    const timestamp = new Date(value);
    if (!Number.isFinite(timestamp.getTime())) throw new BadRequestException('Horário inválido');
    return timestamp;
  };
  if (start === undefined && end === undefined) return undefined;
  const gte = start !== undefined ? parse(start, false) : undefined;
  const lte = end !== undefined ? parse(end, true) : undefined;
  if (gte && lte && gte > lte) throw new BadRequestException('Período de vendas inválido');
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}
