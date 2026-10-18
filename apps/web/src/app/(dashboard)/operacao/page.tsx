'use client';
import { useState } from 'react';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { formatarDataHora } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ActionStatus,
  LoadState,
  Panel,
  SelectField,
  Titulo,
  campo,
  useAction,
} from '@/components/gestao/GestaoUI';
type Monitor = {
  db: boolean;
  redis: boolean;
  pendentes: number;
  falhas: number;
  emailConfigurado: boolean;
  geradoEm: string;
  rotinas: {
    id: string;
    tipo: string;
    status: string;
    tentativas: number;
    erro: string | null;
    createdAt: string;
  }[];
  comprovacoes: {
    id: string;
    tipo: string;
    referencia: string;
    verificadoEm: string;
    observacoes: string;
  }[];
};
export default function OperacaoPage() {
  const remote = useApi<Monitor>('/gestao/monitor'),
    action = useAction();
  const [tipo, setTipo] = useState('RESTAURACAO'),
    [referencia, setReferencia] = useState(''),
    [observacoes, setObservacoes] = useState(''),
    [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const monitor = remote.data;
  return (
    <div className="space-y-6">
      <Titulo
        nome="Saúde e rotinas"
        descricao="Confira os serviços usados pelo Nexly, acompanhe tarefas em segundo plano e registre evidências de verificação. As informações desta área são exclusivas do administrador."
      />
      <Button variant="secondary" loading={remote.loading} onClick={() => void remote.refetch()}>
        Atualizar diagnóstico
      </Button>
      <ActionStatus {...action} />
      <LoadState loading={remote.loading} error={remote.error} retry={remote.refetch} />
      {monitor && !remote.error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Banco de dados', monitor.db ? 'Disponível' : 'Indisponível'],
              ['Redis', monitor.redis ? 'Disponível' : 'Indisponível'],
              ['Rotinas pendentes', String(monitor.pendentes)],
              ['Falhas que precisam de atenção', String(monitor.falhas)],
            ].map(([titulo, valor]) => (
              <div key={titulo} className="rounded-xl border border-white/10 bg-[#111116] p-5">
                <p className="text-sm text-[#A1A1AA]">{titulo}</p>
                <p className="mt-2 text-xl font-semibold">{valor}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Verificado em {formatarDataHora(monitor.geradoEm)}. E-mail:{' '}
            {monitor.emailConfigurado
              ? 'configurado; entrega depende do provedor'
              : 'desativado; configure o provedor antes de ativar'}
            .
          </p>
          <Panel title="Últimas 30 rotinas">
            <p className="mb-4 text-sm leading-6 text-[#A1A1AA]">
              Falhas temporárias têm até cinco tentativas. Uma rotina concluída indica processamento
              ou aceitação pelo provedor, sem comprovar leitura pelo destinatário. Em envios
              externos com resposta incerta, confirme no provedor antes de repetir para evitar
              duplicidade.
            </p>
            <div className="space-y-3">
              {!monitor.rotinas.length && (
                <p className="text-sm text-[#A1A1AA]">Nenhuma rotina enfileirada.</p>
              )}
              {monitor.rotinas.map((j) => (
                <div
                  key={j.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-4"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {j.tipo} · {j.status}
                    </p>
                    <p className="mt-1 text-xs text-[#A1A1AA]">
                      {formatarDataHora(j.createdAt)} · {j.tentativas} tentativas
                    </p>
                    {j.erro && <p className="mt-1 text-sm text-amber-200">{j.erro}</p>}
                  </div>
                  {j.status === 'FALHOU' && j.tipo !== 'EMAIL_RECUPERACAO' && (
                    <Button
                      variant="secondary"
                      loading={action.busy}
                      onClick={() =>
                        void action.run(async () => {
                          await api.post(`/gestao/rotinas/${j.id}/repetir`);
                          await remote.refetch();
                        }, 'Rotina recolocada na fila.')
                      }
                    >
                      Tentar novamente
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Registrar evidência de verificação">
            <p className="mb-5 text-sm leading-6 text-[#A1A1AA]">
              Este registro é uma declaração manual. Para comprovar uma restauração, execute o teste
              em banco descartável e registre a referência do relatório ou da execução no GitHub.
              Cadastrar uma evidência aqui não executa um backup nem verifica seu conteúdo.
            </p>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void action.run(async () => {
                  await api.post('/gestao/comprovacoes', {
                    tipo,
                    referencia,
                    observacoes,
                    verificadoEm: `${data}T00:00:00.000Z`,
                  });
                  setReferencia('');
                  setObservacoes('');
                  await remote.refetch();
                }, 'Evidência registrada.');
              }}
            >
              <SelectField label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="RESTAURACAO">Teste de restauração</option>
                <option value="BACKUP">Backup</option>
                <option value="HOMOLOGACAO">Homologação</option>
              </SelectField>
              <Input
                label="Data da verificação (UTC)"
                required
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
              <Input
                label="Referência do relatório ou execução"
                required
                minLength={5}
                maxLength={500}
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
              <label htmlFor="evidencia-observacoes" className="text-sm text-[#D4D4D8]">
                O que foi verificado
                <textarea
                  id="evidencia-observacoes"
                  className={`${campo} mt-2`}
                  required
                  minLength={10}
                  maxLength={2000}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </label>
              <Button type="submit" loading={action.busy}>
                Registrar evidência
              </Button>
            </form>
          </Panel>
          <Panel title="Evidências registradas manualmente">
            <div className="space-y-4">
              {!monitor.comprovacoes.length && (
                <p className="text-sm text-[#A1A1AA]">Nenhuma evidência registrada.</p>
              )}
              {monitor.comprovacoes.map((c) => (
                <div key={c.id} className="border-b border-white/10 pb-4 text-sm">
                  <h3 className="font-medium">
                    {c.tipo} · {formatarDataHora(c.verificadoEm)}
                  </h3>
                  <p className="mt-1 break-words text-[#A5B4FC]">{c.referencia}</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-[#A1A1AA]">
                    {c.observacoes}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
