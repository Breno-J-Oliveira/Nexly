'use client';

import { PageToolbar } from '@/components/ui/PageToolbar';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { baixarBlob } from '@/lib/download';
import { Button } from '@/components/ui/Button';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function fmt(v: number|null): string { if(v===null)return 'Indisponível'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }

interface DRE { periodo: { dataInicio: string; dataFim: string }; receitaBruta: number; descontos: number; receitaLiquida: number; cmv: number|null; margemBruta: number|null; margemPercentual: number|null; qtdVendas: number; ticketMedio: number; }
interface Fluxo { periodo: { dataInicio: string; dataFim: string }; fluxo: { data: string; entradas: number; total: number; saldoAcumulado: number }[]; saldoFinal: number; }
interface AgendaRel { total: number; concluidos: number; cancelados: number; taxaConclusao: number; taxaCancelamento: number; heatmap: number[][]; rankingProfissionais: { nome: string; total: number }[]; }
interface ProfRel { id: string; nome: string; avatar: string; agendamentos: number; receita: number; comissao: number; avaliacaoMedia: number; }
interface EstoqueRel { produtosMaisConsumidos: { nome: string; quantidade: number }[]; movimentacoes: number; alertas: { id: string; nome: string; estoqueAtual: number; estoqueMinimo: number }[]; }

const TABS = [
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'profissionais', label: 'Profissionais' },
  { id: 'estoque', label: 'Estoque' },
];

const DIAS_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const HORAS = Array.from({ length: 12 }, (_, i) => String(i + 8).padStart(2, '0'));

export default function RelatoriosPage() {
  const [erro,setErro]=useState('');
  const [exportando,setExportando]=useState(false);
  const [retry,setRetry]=useState(0);
  const [aba, setAba] = useState('financeiro');
  const [dre, setDre] = useState<DRE | null>(null);
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [agenda, setAgenda] = useState<AgendaRel | null>(null);
  const [profs, setProfs] = useState<ProfRel[]>([]);
  const [estoque, setEstoque] = useState<EstoqueRel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [inicio, setInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [fim, setFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [ordem, setOrdem] = useState<{ key: keyof ProfRel; dir: 1 | -1 }>({ key: 'receita', dir: -1 });

  useEffect(() => {
    const controller=new AbortController();
    setDre(null);setFluxo(null);setAgenda(null);setProfs([]);setEstoque(null);setErro('');
    if(!inicio||!fim||inicio>fim){setCarregando(false);setErro('Informe um período válido, com data inicial anterior ou igual à final.');return()=>controller.abort();}
    setCarregando(true);
    const params={dataInicio:inicio,dataFim:fim};
    const options={params,signal:controller.signal};
    void Promise.allSettled([api.get<DRE>('/financeiro/dre',options),api.get<Fluxo>('/financeiro/fluxo-caixa',options),api.get<AgendaRel>('/relatorios/agenda',options),api.get<ProfRel[]>('/relatorios/profissionais',options),api.get<EstoqueRel>('/relatorios/estoque',options)]).then(([rDre,rFluxo,rAgenda,rProfs,rEstoque])=>{
      if(controller.signal.aborted)return;
      if(rDre.status==='fulfilled')setDre(rDre.value.data);
      if(rFluxo.status==='fulfilled')setFluxo(rFluxo.value.data);
      if(rAgenda.status==='fulfilled')setAgenda(rAgenda.value.data);
      if(rProfs.status==='fulfilled')setProfs(rProfs.value.data);
      if(rEstoque.status==='fulfilled')setEstoque(rEstoque.value.data);
      if([rDre,rFluxo,rAgenda,rProfs,rEstoque].some(r=>r.status==='rejected'))setErro('Não foi possível atualizar todos os relatórios deste período. Tente novamente.');
    }).finally(()=>{if(!controller.signal.aborted)setCarregando(false);});
    return()=>controller.abort();
  },[inicio,fim,retry]);
  async function exportar(){
    setExportando(true);setErro('');
    try{const r=await api.get<Blob>('/export/vendas/csv',{params:{dataInicio:inicio,dataFim:fim},responseType:'blob'});baixarBlob(r.data,`vendas-${inicio}-${fim}.csv`);}catch{setErro('Não foi possível exportar as vendas. Tente novamente.');}finally{setExportando(false);}
  }

  const profsOrdenados = useMemo(() => {
    return [...profs].sort((a, b) => {
      const va = a[ordem.key];
      const vb = b[ordem.key];
      return va > vb ? ordem.dir : va < vb ? -ordem.dir : 0;
    });
  }, [profs, ordem]);

  const ordenar = (key: keyof ProfRel) => {
    setOrdem((o) => (o.key === key ? { key, dir: o.dir === 1 ? -1 : 1 } : { key, dir: -1 }));
  };

  const maxHeatmap = agenda ? Math.max(0, ...agenda.heatmap.flat()) : 0;

  const KPI = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs" style={{ color: '#A1A1AA' }}>{label}</p>
      <p className="mt-1 text-xl font-bold" style={{ color: color || '#FAFAFA' }}>{value}</p>
    </div>
  );

  return (
    <div>
      <PageToolbar><div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>Relatórios</h2>
          <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>Análise do período selecionado</p>
        </div>
        <Button variant="secondary" loading={exportando} disabled={!inicio||!fim||inicio>fim} onClick={()=>void exportar()}>Exportar CSV (até 500 vendas)</Button>
      </div></PageToolbar>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input aria-label="Data inicial" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="rounded-lg border px-3 py-2 text-[13px]" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }} />
        <span style={{ color: '#A1A1AA' }}>até</span>
        <input aria-label="Data final" type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="rounded-lg border px-3 py-2 text-[13px]" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }} />

        {TABS.map((t) => (
          <button aria-pressed={aba === t.id} key={t.id} onClick={() => setAba(t.id)} className="rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors" style={{ backgroundColor: aba === t.id ? '#6366F1' : '#111116', color: aba === t.id ? '#FAFAFA' : '#A1A1AA', border: '1px solid ' + (aba === t.id ? '#6366F1' : 'rgba(255,255,255,0.10)') }}>{t.label}</button>
        ))}
      </div>

      <p className="mt-3 text-xs text-[#A1A1AA]">Datas do período em UTC.</p>
      {erro&&<div role="alert" className="mt-4 rounded-lg border border-red-400/30 p-4 text-sm text-red-200">{erro} <Button variant="ghost" onClick={()=>setRetry(v=>v+1)}>Tentar novamente</Button></div>}
      {carregando && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[86px] animate-pulse rounded-xl" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      )}

      {/* ── Financeiro ── */}
      {!carregando && aba === 'financeiro' && (
        <div className="mt-6 space-y-6">
          {dre ? (
            <div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KPI label="Receita Bruta" value={fmt(dre.receitaBruta)} />
                <KPI label="Receita Líquida" value={fmt(dre.receitaLiquida)} color="#22C55E" />
                <KPI label="CMV" value={fmt(dre.cmv)} color="#EAB308" />
                <KPI label="Ticket Médio" value={fmt(dre.ticketMedio)} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <KPI label="Margem Bruta" value={fmt(dre.margemBruta)} color={dre.margemBruta===null?'#A1A1AA':dre.margemBruta>=0?'#22C55E':'#EF4444'} />
                <KPI label="Margem %" value={dre.margemPercentual===null?'Indisponível':dre.margemPercentual.toFixed(1)+'%'} color={(dre.margemPercentual ?? 0) >= 0 ? '#22C55E' : '#EF4444'} />
                <KPI label="Descontos" value={fmt(dre.descontos)} color="#EF4444" />
              </div>
              <p className="mt-4 text-xs text-[#A1A1AA]">CMV e margens dependem do custo histórico dos produtos, que ainda não é registrado.</p>
              <p className="mt-4 text-xs" style={{ color: '#A1A1AA' }}>
                {dre.qtdVendas} {dre.qtdVendas === 1 ? 'venda' : 'vendas'} no período
              </p>
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#A1A1AA' }}>Não foi possível carregar o DRE do período.</p>
          )}

          {fluxo && (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="min-w-0 rounded-xl border border-white/10 bg-[#111116] p-5">
                <h3 className="text-sm font-semibold">Faturamento do Período</h3>
                <p className="mt-1 text-xs text-[#A1A1AA]">Receita diária das vendas registradas</p>
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fluxo.fluxo}>
                      <CartesianGrid stroke="rgba(255,255,255,.04)" vertical={false} />
                      <XAxis dataKey="data" tickFormatter={value => String(value).slice(5)} tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                      <Tooltip contentStyle={{ background: '#18181F', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8 }} formatter={value => fmt(Number(value))} />
                      <Bar dataKey="total" name="Faturamento" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="min-w-0 rounded-xl border border-white/10 bg-[#111116] p-5">
                <h3 className="text-sm font-semibold">Ranking de Profissionais</h3>
                <p className="mt-1 text-xs text-[#A1A1AA]">Receita individual no período selecionado</p>
                <div className="mt-6 space-y-5">{[...profs].sort((a, b) => b.receita - a.receita).slice(0, 5).map((p, i) => <div key={p.id}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="text-[#A1A1AA]">{i + 1}. {p.nome}</span><span>{fmt(p.receita)}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[#6366F1]" style={{ width: `${Math.max(0, Math.min(100, p.receita / Math.max(1, ...profs.map(item => item.receita)) * 100))}%` }} /></div></div>)}</div>
              </section>
            </div>
          )}

          {fluxo && (
            <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th className="px-4 py-3 font-medium" style={{ color: '#A1A1AA' }}>Data</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#A1A1AA' }}>Vendas</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#A1A1AA' }}>Total</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#A1A1AA' }}>Saldo Acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxo.fluxo.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: '#A1A1AA' }}>Nenhuma movimentação no período.</td></tr>
                  )}
                  {fluxo.fluxo.map((f) => (
                    <tr key={f.data} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3" style={{ color: '#FAFAFA' }}>{new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3" style={{ color: '#818CF8' }}>{f.entradas}</td>
                      <td className="px-4 py-3" style={{ color: '#22C55E' }}>{fmt(f.total)}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: f.saldoAcumulado >= 0 ? '#22C55E' : '#EF4444' }}>{fmt(f.saldoAcumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Agenda ── */}
      {!carregando && aba === 'agenda' && agenda && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KPI label="Total de agendamentos" value={String(agenda.total)} />
            <KPI label="Taxa de conclusão" value={agenda.taxaConclusao.toFixed(1) + '%'} color="#22C55E" />
            <KPI label="Taxa de cancelamento" value={agenda.taxaCancelamento.toFixed(1) + '%'} color="#EF4444" />
            <KPI label="Concluídos" value={String(agenda.concluidos)} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium" style={{ color: '#FAFAFA' }}>Horários de pico</p>
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
                  <div />
                  {DIAS_LABEL.map((d) => (
                    <div key={d} className="px-1 text-center text-[11px]" style={{ color: '#A1A1AA' }}>{d}</div>
                  ))}
                </div>
                {HORAS.map((hora, i) => (
                  <div key={hora} className="grid" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
                    <div className="flex items-center text-[11px]" style={{ color: '#A1A1AA' }}>{hora}h</div>
                    {DIAS_LABEL.map((_, d) => {
                      const count = agenda.heatmap[d]?.[i] ?? 0;
                      const alpha = maxHeatmap === 0 ? 0 : count / maxHeatmap;
                      return (
                        <div
                          key={d}
                          title={`${DIAS_LABEL[d]} ${hora}h: ${count}`}
                          className="m-0.5 flex h-6 items-center justify-center rounded text-[10px]"
                          style={{
                            backgroundColor: count === 0 ? 'rgba(255,255,255,0.03)' : `rgba(99,102,241,${0.15 + 0.85 * alpha})`,
                            color: count > 0 ? '#FAFAFA' : 'transparent',
                          }}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium" style={{ color: '#FAFAFA' }}>Ranking de profissionais</p>
            <div className="space-y-2">
              {agenda.rankingProfissionais.length === 0 && <p className="text-sm" style={{ color: '#A1A1AA' }}>Sem agendamentos no período.</p>}
              {agenda.rankingProfissionais.map((r) => {
                const max = agenda.rankingProfissionais[0]?.total ?? 1;
                return (
                  <div key={r.nome} className="flex items-center gap-3">
                    <span className="w-40 truncate text-[13px]" style={{ color: '#FAFAFA' }}>{r.nome}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(r.total / max) * 100}%`, backgroundColor: '#6366F1' }} />
                    </div>
                    <span className="w-8 text-right text-[13px]" style={{ color: '#A1A1AA' }}>{r.total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Profissionais ── */}
      {!carregando && aba === 'profissionais' && (
        <div className="mt-6 overflow-x-auto rounded-xl" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="px-4 py-3 font-medium" style={{ color: '#A1A1AA' }}>Profissional</th>
                {([['agendamentos', 'Agendamentos'], ['receita', 'Receita'], ['comissao', 'Comissão'], ['avaliacaoMedia', 'Avaliação']] as [keyof ProfRel, string][]).map(([key, label]) => (
                  <th key={key} className="cursor-pointer px-4 py-3 font-medium" style={{ color: ordem.key === key ? '#818CF8' : '#A1A1AA' }} onClick={() => ordenar(key)}>
                    {label} {ordem.key === key ? (ordem.dir === -1 ? '↓' : '↑') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profsOrdenados.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold" style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#A5B4FC' }}>{p.avatar}</span>
                      <span style={{ color: '#FAFAFA' }}>{p.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>{p.agendamentos}</td>
                  <td className="px-4 py-3" style={{ color: '#22C55E' }}>{fmt(p.receita)}</td>
                  <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>{fmt(p.comissao)}</td>
                  <td className="px-4 py-3" style={{ color: '#EAB308' }}>{p.avaliacaoMedia.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Estoque ── */}
      {!carregando && aba === 'estoque' && estoque && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <KPI label="Movimentações" value={String(estoque.movimentacoes)} />
            <KPI label="Produtos em alerta" value={String(estoque.alertas.length)} color={estoque.alertas.length > 0 ? '#EF4444' : '#22C55E'} />
            <KPI label="Top consumidos" value={String(estoque.produtosMaisConsumidos.length)} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium" style={{ color: '#FAFAFA' }}>Produtos mais consumidos</p>
            {estoque.produtosMaisConsumidos.length === 0 && <p className="text-sm" style={{ color: '#A1A1AA' }}>Sem saídas no período.</p>}
            <div className="space-y-2">
              {estoque.produtosMaisConsumidos.map((p) => {
                const max = estoque.produtosMaisConsumidos[0]?.quantidade ?? 1;
                return (
                  <div key={p.nome} className="flex items-center gap-3">
                    <span className="w-48 truncate text-[13px]" style={{ color: '#FAFAFA' }}>{p.nome}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(p.quantidade / max) * 100}%`, backgroundColor: '#6366F1' }} />
                    </div>
                    <span className="w-8 text-right text-[13px]" style={{ color: '#A1A1AA' }}>{p.quantidade}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium" style={{ color: '#FAFAFA' }}>Alertas de reposição</p>
            {estoque.alertas.length === 0 && <p className="text-sm" style={{ color: '#A1A1AA' }}>Nenhum produto abaixo do mínimo.</p>}
            <div className="space-y-2">
              {estoque.alertas.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border px-4 py-2" style={{ backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
                  <span className="text-[13px]" style={{ color: '#FAFAFA' }}>{a.nome}</span>
                  <span className="text-[13px]" style={{ color: '#EF4444' }}>{a.estoqueAtual} / mín. {a.estoqueMinimo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
