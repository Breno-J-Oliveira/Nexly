/** Limites do dia no fuso do navegador, convertidos uma única vez para transporte UTC. */
export function limitesCalendario(primeiro: Date, ultimo = primeiro) {
  const inicio = new Date(primeiro);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(ultimo);
  fim.setHours(23, 59, 59, 999);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

export function inicioDaSemana(data: Date) {
  const inicio = new Date(data);
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

/** Distribui intervalos sobrepostos em colunas, sem esconder atendimentos de outra pessoa. */
export function organizarHorarios<
  T extends { id: string; dataHora: string; dataHoraFim: string | null },
>(items: T[]) {
  const result: { item: T; coluna: number; colunas: number }[] = [];
  let grupo: typeof result = [];
  let fins: number[] = [];
  let fimGrupo = 0;
  const finalizar = () => {
    for (const placement of grupo) result.push({ ...placement, colunas: fins.length });
    grupo = [];
    fins = [];
    fimGrupo = 0;
  };
  for (const item of [...items].sort(
    (a, b) =>
      new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime() || a.id.localeCompare(b.id),
  )) {
    const inicio = new Date(item.dataHora).getTime();
    const fim = item.dataHoraFim ? new Date(item.dataHoraFim).getTime() : inicio + 1800000;
    if (inicio >= fimGrupo) finalizar();
    let coluna = fins.findIndex((end) => end <= inicio);
    if (coluna === -1) coluna = fins.length;
    fins[coluna] = fim;
    fimGrupo = Math.max(fimGrupo, fim);
    grupo.push({ item, coluna, colunas: 1 });
  }
  finalizar();
  return result;
}
