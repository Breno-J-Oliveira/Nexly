'use client';
import { useState } from 'react';
import { lerCsv } from '@nexly/shared';
import { api } from '@/lib/api';
import { baixarBlob } from '@/lib/download';
import { Button } from '@/components/ui/Button';
import {
  ActionStatus,
  Panel,
  SelectField,
  Titulo,
  erroDaAcao,
  useAction,
} from '@/components/gestao/GestaoUI';
type Linha = {
  nome: string;
  email?: string;
  telefone?: string;
  sku?: string;
  preco?: number;
  estoqueAtual?: number;
};
type Previa = {
  linhas: Linha[];
  erros: { linha: number; mensagem: string }[];
  duplicados: number;
  total: number;
};
export default function ImportarPage() {
  const [tipo, setTipo] = useState('clientes'),
    [arquivo, setArquivo] = useState<File | null>(null),
    [preview, setPreview] = useState<Previa | null>(null),
    [request, setRequest] = useState<{ tipo: string; chave: string; linhas: Linha[] } | null>(null),
    [erro, setErro] = useState(''),
    [concluida, setConcluida] = useState(false);
  const action = useAction();
  async function analisar() {
    if (!arquivo) return;
    setPreview(null);
    setRequest(null);
    setErro('');
    setConcluida(false);
    await action.run(async () => {
      if (arquivo.size > 2 * 1024 * 1024) {
        setErro('O arquivo deve ter até 2 MB.');
        return false;
      }
      let linhas: Linha[];
      try {
        linhas = lerCsv(await arquivo.text()).map((l) =>
          tipo === 'clientes'
            ? { nome: l.nome ?? '', email: l.email || undefined, telefone: l.telefone || undefined }
            : {
                nome: l.nome ?? '',
                sku: l.sku ?? '',
                preco: l.preco?.trim() ? Number(l.preco.replace(',', '.')) : Number.NaN,
                estoqueAtual: l.estoqueatual?.trim() ? Number(l.estoqueatual) : 0,
              },
        );
        if (linhas.some((l) => l.preco !== undefined && !Number.isFinite(l.preco)))
          throw new Error('Informe preços válidos nas linhas de produtos.');
      } catch (e) {
        setErro(e instanceof Error ? e.message : erroDaAcao(e));
        return false;
      }
      const body = { tipo, chave: crypto.randomUUID(), linhas };
      const { data } = await api.post<Previa>('/gestao/importacao/previa', body);
      setRequest(body);
      setPreview(data);
    }, 'Prévia preparada. Confira os registros antes de confirmar.');
  }
  return (
    <div className="space-y-6">
      <Titulo
        nome="Importar cadastros"
        descricao="Traga clientes ou produtos de uma planilha CSV. Confira a prévia antes de salvar: registros duplicados são ignorados e o arquivo original não é armazenado."
      />
      <Panel title="1. Prepare seu arquivo">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="O que deseja importar?"
            value={tipo}
            disabled={action.busy}
            onChange={(e) => {
              setTipo(e.target.value);
              setPreview(null);
              setRequest(null);
              setConcluida(false);
            }}
          >
            <option value="clientes">Clientes</option>
            <option value="produtos">Produtos para o estoque central</option>
          </SelectField>
          <div className="self-end">
            <Button
              variant="secondary"
              onClick={() =>
                baixarBlob(
                  new Blob(
                    [
                      '\uFEFF' +
                        (tipo === 'clientes'
                          ? 'nome;email;telefone\nMaria Exemplo;maria@example.com;11999999999\n'
                          : 'nome;sku;preco;estoqueAtual\nProduto exemplo;EXEMPLO-01;25,90;10\n'),
                    ],
                    { type: 'text/csv;charset=utf-8' },
                  ),
                  `modelo-${tipo}.csv`,
                )
              }
            >
              Baixar modelo CSV
            </Button>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#A1A1AA]">
          Até 500 linhas e 2 MB, codificação UTF-8, separador vírgula ou ponto e vírgula. Para
          produtos, nome, SKU e preço são obrigatórios; o estoque inicial vai para a central.
          Clientes repetidos são identificados por e-mail, telefone ou nome quando não há contato.
        </p>
      </Panel>
      <Panel title="2. Confira a prévia">
        <label className="block text-sm text-[#D4D4D8]" htmlFor="arquivo-csv">
          Arquivo CSV
          <input
            id="arquivo-csv"
            type="file"
            accept=".csv,text/csv"
            disabled={action.busy}
            className="mt-3 block max-w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-4 file:py-3 file:text-indigo-200"
            onChange={(e) => {
              setArquivo(e.target.files?.[0] ?? null);
              setPreview(null);
              setRequest(null);
              setErro('');
              setConcluida(false);
            }}
          />
        </label>
        <Button
          className="mt-4"
          disabled={!arquivo}
          loading={action.busy}
          onClick={() => void analisar()}
        >
          Analisar arquivo
        </Button>
      </Panel>
      <ActionStatus error={erro || action.error} success={action.success} />
      {preview && (
        <Panel title="3. Confirme a importação">
          <p className="mb-4 text-sm text-[#D4D4D8]">
            {preview.total} linhas analisadas · {preview.linhas.length} novos cadastros ·{' '}
            {preview.duplicados} duplicados ignorados.
          </p>
          {preview.erros.length > 0 && (
            <ul className="mb-4 space-y-1 text-sm text-red-200">
              {preview.erros.map((e) => (
                <li key={e.linha}>
                  Linha {e.linha}: {e.mensagem}
                </li>
              ))}
            </ul>
          )}
          <div className="max-h-80 overflow-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Prévia dos novos cadastros</caption>
              <thead className="bg-[#18181F]">
                <tr>
                  <th className="p-3" scope="col">
                    Nome
                  </th>
                  <th className="p-3" scope="col">
                    {tipo === 'clientes' ? 'Contato' : 'SKU / preço / estoque'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.linhas.map((l, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="p-3">{l.nome}</td>
                    <td className="p-3 text-[#A1A1AA]">
                      {tipo === 'clientes'
                        ? [l.email, l.telefone].filter(Boolean).join(' · ')
                        : `${l.sku} · R$ ${Number(l.preco).toFixed(2)} · ${l.estoqueAtual}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            className="mt-5"
            loading={action.busy}
            disabled={!request || concluida || !!preview.erros.length || !preview.linhas.length}
            onClick={() =>
              void action.run(async () => {
                const { data } = await api.post<{ criados: number; ignorados: number }>(
                  '/gestao/importacao/confirmar',
                  request,
                );
                setConcluida(true);
                setErro('');
                setPreview((p) => (p ? { ...p, duplicados: data.ignorados } : p));
              }, 'Importação concluída. Seus cadastros já estão disponíveis.')
            }
          >
            {concluida ? 'Importação concluída' : `Importar ${preview.linhas.length} cadastros`}
          </Button>
        </Panel>
      )}
    </div>
  );
}
