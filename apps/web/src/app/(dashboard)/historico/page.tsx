'use client';
import { useState } from 'react';
import { useApi } from '@/lib/useApi';
import { formatarDataHora } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ActionStatus, LoadState, Panel, SelectField, Titulo } from '@/components/gestao/GestaoUI';
type Evento = {
  id: string;
  acao: string;
  recurso: string;
  recursoId: string | null;
  criadoEm: string;
  usuario: { nome: string; email: string } | null;
  dadosAntigos: unknown;
  dadosNovos: unknown;
};
export default function HistoricoPage() {
  const [pagina, setPagina] = useState(1),
    [acao, setAcao] = useState(''),
    [recurso, setRecurso] = useState(''),
    [inicio, setInicio] = useState(''),
    [fim, setFim] = useState(''),
    [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<Record<string, string>>({});
  const remote = useApi<{ data: Evento[]; total: number }>('/gestao/historico', {
    params: { ...filtro, pagina },
  });
  return (
    <div className="space-y-6">
      <Titulo
        nome="Histórico de alterações"
        descricao="Consulte quem alterou os registros da sua empresa. Esta área é exclusiva do administrador. Senhas e credenciais são ocultadas; os registros não podem ser editados por esta tela."
      />
      <Panel title="Filtrar eventos">
        <form
          className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (inicio && fim && inicio > fim) {
              setErro('A data inicial deve ser anterior à final.');
              return;
            }
            setErro('');
            setPagina(1);
            setFiltro({
              ...(acao ? { acao } : {}),
              ...(recurso ? { recurso } : {}),
              ...(inicio ? { inicio: `${inicio}T00:00:00.000Z` } : {}),
              ...(fim ? { fim: `${fim}T23:59:59.999Z` } : {}),
            });
          }}
        >
          <SelectField label="Ação" value={acao} onChange={(e) => setAcao(e.target.value)}>
            <option value="">Todas</option>
            {['CRIAR', 'EDITAR', 'EXCLUIR', 'LOGIN', 'LOGOUT'].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </SelectField>
          <Input
            label="Recurso"
            placeholder="Ex.: Clientes"
            maxLength={80}
            value={recurso}
            onChange={(e) => setRecurso(e.target.value)}
          />
          <Input
            label="De (UTC)"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
          <Input
            label="Até (UTC)"
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
          <Button type="submit">Aplicar filtros</Button>
        </form>
      </Panel>
      <ActionStatus error={erro} success="" />
      <LoadState loading={remote.loading} error={remote.error} retry={remote.refetch} />
      {!remote.error && !remote.loading && (
        <Panel title={`${remote.data?.total ?? 0} eventos encontrados`}>
          <div className="space-y-3">
            {!remote.data?.data.length && (
              <p className="py-6 text-sm text-[#A1A1AA]">Nenhum evento com estes filtros.</p>
            )}
            {remote.data?.data.map((e) => (
              <details key={e.id} className="rounded-lg border border-white/10 p-4">
                <summary className="cursor-pointer text-sm">
                  <span className="font-medium">
                    {e.recurso} · {e.acao}
                  </span>
                  <span className="mt-1 block text-[#A1A1AA]">
                    {e.usuario?.nome ?? 'Sistema'} · {formatarDataHora(e.criadoEm)}
                  </span>
                </summary>
                <p className="mt-3 break-all text-xs text-[#A1A1AA]">
                  Registro: {e.recursoId ?? 'Não informado'}
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {[
                    ['Antes', e.dadosAntigos],
                    ['Alterações informadas', e.dadosNovos],
                  ].map(([titulo, dados]) => (
                    <div key={String(titulo)}>
                      <h3 className="mb-2 text-sm font-medium">{String(titulo)}</h3>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#18181F] p-3 text-xs leading-6 text-[#D4D4D8]">
                        {dados ? JSON.stringify(dados, null, 2) : 'Sem dados registrados'}
                      </pre>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              disabled={pagina === 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <p className="text-sm text-[#A1A1AA]">
              Página {pagina} de {Math.max(1, Math.ceil((remote.data?.total ?? 0) / 25))}
            </p>
            <Button
              variant="secondary"
              disabled={pagina * 25 >= (remote.data?.total ?? 0)}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
