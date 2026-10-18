'use client';
import { useState } from 'react';
import { PRESETS } from '@nexly/shared';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace';
import { useApi } from '@/lib/useApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ActionStatus, LoadState, Panel, SelectField, useAction } from './GestaoUI';
export type Inicio = {
  preferencias: { nomeCliente?: string; nomeServico?: string; segmento?: string };
  primeiroAcessoDispensado: boolean;
  preset: string | null;
  etapas: { id: string; nome: string; href: string; concluida: boolean }[];
};
function FormPreferencias({ data, refresh }: { data: Inicio; refresh: () => Promise<void> }) {
  const { reload } = useWorkspace(),
    action = useAction();
  const [segmento, setSegmento] = useState(
      data.preferencias.segmento ?? data.preset ?? 'personalizado',
    ),
    [cliente, setCliente] = useState(data.preferencias.nomeCliente ?? 'Clientes'),
    [servico, setServico] = useState(data.preferencias.nomeServico ?? 'Serviços'),
    [guia, setGuia] = useState(!data.primeiroAcessoDispensado);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api.put('/gestao/preferencias', {
            segmento,
            nomeCliente: cliente,
            nomeServico: servico,
            mostrarGuia: guia,
          });
          await Promise.all([refresh(), reload()]);
        }, 'Preferências atualizadas. Os nomes aparecem no menu, no painel e nos cadastros.');
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Segmento do negócio"
          value={segmento}
          onChange={(e) => {
            const value = e.target.value;
            setSegmento(value);
            setCliente(value === 'psicologia' || value === 'estetica' ? 'Pacientes' : 'Clientes');
            setServico(
              value === 'psicologia'
                ? 'Sessões'
                : value === 'veterinaria'
                  ? 'Consultas'
                  : value === 'estetica'
                    ? 'Procedimentos'
                    : 'Serviços',
            );
          }}
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </SelectField>
        <Input
          label="Nome para os clientes (plural)"
          required
          minLength={2}
          maxLength={30}
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
        />
        <Input
          label="Nome para os serviços (plural)"
          required
          minLength={2}
          maxLength={30}
          value={servico}
          onChange={(e) => setServico(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={guia} onChange={(e) => setGuia(e.target.checked)} />
        Mostrar o guia de primeiros passos no painel
      </label>
      <ActionStatus {...action} />
      <Button type="submit" loading={action.busy}>
        Salvar preferências
      </Button>
    </form>
  );
}
export function PreferenciasNegocio() {
  const remote = useApi<Inicio>('/gestao/inicio');
  return (
    <Panel title="Os termos da sua rotina">
      <p className="mb-5 text-sm leading-6 text-[#A1A1AA]">
        Escolha como seu negócio chama clientes e serviços. Isso adapta os nomes exibidos; os campos
        continuam sendo cadastros e agendamentos, sem prontuário clínico.
      </p>
      <LoadState loading={remote.loading} error={remote.error} retry={remote.refetch} />
      {remote.data && !remote.error && (
        <FormPreferencias data={remote.data} refresh={remote.refetch} />
      )}
    </Panel>
  );
}
