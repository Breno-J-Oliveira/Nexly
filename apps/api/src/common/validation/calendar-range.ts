import { BadRequestException } from '@nestjs/common';
import { isISO8601 } from 'class-validator';
import { dateRange } from './date-range';

/** Clientes podem enviar limites UTC calculados no seu fuso; datas antigas seguem em UTC. */
export function calendarRange(filters: {
  data?: string;
  dataFim?: string;
  inicio?: string;
  fim?: string;
}) {
  const { data, dataFim, inicio, fim } = filters;
  if (inicio !== undefined || fim !== undefined) {
    if (data !== undefined || dataFim !== undefined)
      throw new BadRequestException('Use data ou limites de horário, sem misturá-los');
    const valid = (value: unknown): value is string =>
      typeof value === 'string' &&
      isISO8601(value, { strict: true, strictSeparator: true }) &&
      /(Z|[+-]\d{2}:\d{2})$/.test(value);
    if (!valid(inicio) || !valid(fim))
      throw new BadRequestException('Informe início e fim válidos com fuso horário');
    const start = new Date(inicio),
      end = new Date(fim);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end)
      throw new BadRequestException('Período inválido');
    return { inicio: start, fim: end };
  }
  if (data !== undefined) return dateRange(data, dataFim ?? data);
  if (dataFim !== undefined) throw new BadRequestException('Informe também a data inicial');
  return null;
}
