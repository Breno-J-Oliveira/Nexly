import { BadRequestException } from '@nestjs/common';
/** Limites de dias UTC, estaveis mesmo quando muda o fuso do servidor. */
export function dateRange(dataInicio: string, dataFim: string) {
  const parse = (value: string, end: boolean) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new BadRequestException('Informe datas no formato AAAA-MM-DD');
    const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
      throw new BadRequestException('Data inválida');
    return date;
  };
  const inicio = parse(dataInicio, false),
    fim = parse(dataFim, true);
  if (inicio > fim)
    throw new BadRequestException('A data inicial deve ser anterior ou igual à final');
  return { inicio, fim };
}
