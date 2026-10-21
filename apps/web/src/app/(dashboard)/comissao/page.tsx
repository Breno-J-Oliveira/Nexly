'use client';

import { PageToolbar } from '@/components/ui/PageToolbar';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ErrorState } from '@/components/ui/ErrorState';
import { limitesCalendario } from '@/lib/calendar';

interface ProfissionalComissao {
  id: string;
  nome: string;
  comissaoPercentual: number;
  faturamento: number;
  comissao: number;
  totalServicos: number;
  ativo?: boolean;
}
interface ResumoComissao {
  profissionais: ProfissionalComissao[];
  total: { faturamento: number; comissao: number; servicos: number; estimados?: number };
}

function fmt(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ComissaoPage() {
  const [dados, setDados] = useState<ResumoComissao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [inicio, setInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return localDay(d);
  });
  const [fim, setFim] = useState(() => localDay(new Date()));

  const [tentativa, setTentativa] = useState(0);
  const periodoValido = Boolean(inicio && fim && inicio <= fim);

  useEffect(() => {
    if (!periodoValido) {
      setDados(null);
      setCarregando(false);
      return;
    }
    const controller = new AbortController();
    const limites = limitesCalendario(new Date(inicio + 'T12:00:00'), new Date(fim + 'T12:00:00'));
    setCarregando(true);
    api
      .get<ResumoComissao>('/comissao/resumo', {
        signal: controller.signal,
        params: { dataInicio: limites.inicio, dataFim: limites.fim },
      })
      .then((res) => {
        if (!controller.signal.aborted) setDados(res.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDados(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [inicio, fim, periodoValido, tentativa]);

  return (
    <div>
      <PageToolbar>
        <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>
          Comissões
        </h2>
        <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
          Valores e percentuais registrados na conclusão de cada atendimento
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-[#A1A1AA]">
          Base do cálculo: preço do serviço ao concluir o atendimento. Esta tela não confirma
          recebimentos nem realiza pagamentos.
        </p>
      </PageToolbar>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          aria-label="Data inicial"
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          className="rounded-lg border px-3 py-2 text-[13px]"
          style={{
            backgroundColor: '#111116',
            borderColor: 'rgba(255,255,255,0.10)',
            color: '#FAFAFA',
          }}
        />
        <span style={{ color: '#71717A', alignSelf: 'center' }}>até</span>
        <input
          aria-label="Data final"
          type="date"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          className="rounded-lg border px-3 py-2 text-[13px]"
          style={{
            backgroundColor: '#111116',
            borderColor: 'rgba(255,255,255,0.10)',
            color: '#FAFAFA',
          }}
        />
      </div>

      {!periodoValido ? (
        <p role="alert" className="mt-8 text-sm text-red-300">
          Informe as duas datas; a inicial deve ser anterior ou igual à final.
        </p>
      ) : carregando ? (
        <p className="mt-8 text-sm" style={{ color: '#71717A' }}>
          Carregando…
        </p>
      ) : !dados ? (
        <ErrorState
          message="Não foi possível carregar as comissões."
          onRetry={() => setTentativa((n) => n + 1)}
        />
      ) : (
        <>
          <p className="mt-1 text-xs" style={{ color: '#52525B' }}>
            Período: {new Date(inicio + 'T00:00:00').toLocaleDateString('pt-BR')} até{' '}
            {new Date(fim + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
          {Boolean(dados.total.estimados) && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-7 text-amber-200"
            >
              Este período contém {dados.total.estimados} atendimento(s) antigo(s) sem os valores da
              conclusão. Para eles, o cálculo usa o preço e a comissão atuais como estimativa.
              Confira os registros antes de realizar pagamentos.
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs" style={{ color: '#71717A' }}>
                Faturamento
              </p>
              <p className="mt-1 text-lg font-bold" style={{ color: '#FAFAFA' }}>
                {fmt(dados.total.faturamento)}
              </p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs" style={{ color: '#71717A' }}>
                Total de comissões
              </p>
              <p className="mt-1 text-lg font-bold" style={{ color: '#22C55E' }}>
                {fmt(dados.total.comissao)}
              </p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs" style={{ color: '#71717A' }}>
                Serviços
              </p>
              <p className="mt-1 text-lg font-bold" style={{ color: '#818CF8' }}>
                {dados.total.servicos}
              </p>
            </div>
          </div>

          <div
            className="mt-6 overflow-x-auto rounded-xl"
            style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <table
              role="table"
              aria-label="Comissões por profissional"
              className="block w-full text-left text-[13px] sm:table"
            >
              <thead
                className="sr-only sm:not-sr-only"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <tr>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>
                    Profissional
                  </th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>
                    Taxa atual
                  </th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>
                    Serviços
                  </th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>
                    Faturamento
                  </th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>
                    Comissão (R$)
                  </th>
                </tr>
              </thead>
              <tbody className="grid gap-3 p-3 sm:table-row-group sm:p-0">
                {dados.profissionais.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: '#71717A' }}>
                      Nenhum atendimento no período.
                    </td>
                  </tr>
                )}
                {dados.profissionais.map((p) => (
                  <tr
                    key={p.id}
                    className="grid grid-cols-2 rounded-xl border border-white/10 p-2 sm:table-row sm:rounded-none sm:border-0 sm:p-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td
                      className="col-span-2 min-w-0 break-words px-3 py-3 sm:px-4"
                      style={{ color: '#FAFAFA' }}
                    >
                      {p.nome}
                      {p.ativo === false && (
                        <span className="ml-2 text-xs text-[#A1A1AA]">Inativo</span>
                      )}
                    </td>
                    <td
                      data-label="Taxa atual"
                      className="min-w-0 px-3 py-3 before:mb-1 before:block before:text-[11px] before:font-normal before:text-[#A1A1AA] before:content-[attr(data-label)] sm:px-4 sm:before:hidden"
                      style={{ color: '#818CF8' }}
                    >
                      {p.comissaoPercentual}%
                    </td>
                    <td
                      data-label="Serviços"
                      className="min-w-0 px-3 py-3 before:mb-1 before:block before:text-[11px] before:content-[attr(data-label)] sm:px-4 sm:before:hidden"
                      style={{ color: '#A1A1AA' }}
                    >
                      {p.totalServicos}
                    </td>
                    <td
                      data-label="Faturamento"
                      className="min-w-0 break-words px-3 py-3 before:mb-1 before:block before:text-[11px] before:font-normal before:text-[#A1A1AA] before:content-[attr(data-label)] sm:px-4 sm:before:hidden"
                      style={{ color: '#FAFAFA' }}
                    >
                      {fmt(p.faturamento)}
                    </td>
                    <td
                      data-label="Comissão"
                      className="min-w-0 break-words px-3 py-3 font-semibold before:mb-1 before:block before:text-[11px] before:font-normal before:text-[#A1A1AA] before:content-[attr(data-label)] sm:px-4 sm:before:hidden"
                      style={{ color: '#22C55E' }}
                    >
                      {fmt(p.comissao)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
