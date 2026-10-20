import { Prisma } from '@prisma/client';

interface CompletedAppointment {
  valorServicoConcluido?: Prisma.Decimal | number | null;
  comissaoPercentualAplicada?: Prisma.Decimal | number | null;
  servico: { preco: Prisma.Decimal | number };
}

/** Não reconstrói valores antigos: resultados sem snapshot são identificados como estimados. */
export function commissionTotals(appointments: CompletedAppointment[], currentRate: number) {
  let revenue = new Prisma.Decimal(0);
  let commission = new Prisma.Decimal(0);
  let estimados = 0;
  for (const appointment of appointments) {
    const value = new Prisma.Decimal(
      appointment.valorServicoConcluido ?? appointment.servico.preco,
    );
    const rate = new Prisma.Decimal(appointment.comissaoPercentualAplicada ?? currentRate);
    revenue = revenue.plus(value);
    commission = commission.plus(
      value.times(rate).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
    );
    if (appointment.valorServicoConcluido == null || appointment.comissaoPercentualAplicada == null)
      estimados++;
  }
  return {
    faturamento: revenue.toNumber(),
    comissao: commission.toNumber(),
    totalServicos: appointments.length,
    estimados,
  };
}
