import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { BadRequestException } from '@nestjs/common';
import { dateRange } from '../common/validation/date-range';

export function diaNoFuso(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, 'yyyy-MM-dd');
}

export function instanteNoFuso(day: string, hour: string, timeZone: string): Date {
  return fromZonedTime(`${day}T${hour}:00`, timeZone);
}

/** Clientes antigos enviam hora sem offset: ela pertence ao estabelecimento. */
export function instanteSolicitado(value: string, timeZone: string): Date {
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? new Date(value) : fromZonedTime(value, timeZone);
}

export function periodoNoFuso(day: string, timeZone: string) {
  const { inicio } = dateRange(day, day);
  const nextDay = new Date(inicio.getTime() + 86400000).toISOString().slice(0, 10);
  return {
    inicio: inicioDoDia(day, timeZone),
    fimExclusivo: inicioDoDia(nextDay, timeZone),
  };
}

function inicioDoDia(day: string, timeZone: string): Date {
  const candidate = instanteNoFuso(day, '00:00', timeZone);
  const timestamp = candidate.getTime();
  if (diaNoFuso(candidate, timeZone) === day && diaNoFuso(new Date(timestamp - 1), timeZone) < day)
    return candidate;
  // Em transições de fuso, meia-noite pode não existir ou ocorrer duas vezes.
  // Só nesses casos procura o primeiro instante real do dia solicitado.
  let before = timestamp - 36 * 3600000;
  let after = timestamp + 36 * 3600000;
  while (after - before > 1) {
    const middle = Math.floor((before + after) / 2);
    if (diaNoFuso(new Date(middle), timeZone) < day) before = middle;
    else after = middle;
  }
  const first = new Date(after);
  if (diaNoFuso(first, timeZone) !== day)
    throw new BadRequestException('Data inexistente no fuso do estabelecimento');
  return first;
}
