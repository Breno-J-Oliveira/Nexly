'use client';

import { useEffect, useRef, useState } from 'react';
import { ProdutoForm, type ProdutoCadastro } from '@/components/ProdutoForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { toastSuccess } from '@/components/ui/Toaster';
import { api } from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { useApi } from '@/lib/useApi';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type Produto = Pick<ProdutoCadastro, 'id' | 'nome'> & { sku?: string };

interface Props {
  servico: { id: string; nome: string };
  insumos: { produtoId: string; quantidade: number }[];
  podeCriarProduto: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function InsumoModal({ servico, insumos, podeCriarProduto, onClose, onSaved }: Props) {
  const [novoProduto, setNovoProduto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [produto, setProduto] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [erro, setErro] = useState('');
  const buscaRef = useRef<HTMLInputElement>(null);
  const quantidadeRef = useRef<HTMLInputElement>(null);
  const tituloCadastro = useRef<HTMLHeadingElement>(null);
  const search = useDebouncedValue(busca.trim());
  const produtos = useApi<{ data: Produto[]; total: number }>('/produtos', {
    immediate: !novoProduto,
    params: { limit: 30, search: search || undefined },
  });
  const atualizando = insumos.some((insumo) => insumo.produtoId === produto?.id);

  useEffect(() => {
    if (novoProduto) tituloCadastro.current?.focus();
  }, [novoProduto]);

  async function associar() {
    if (!produto || salvando) return;
    setSalvando(true);
    setErro('');
    try {
      await api.post(`/servicos/${servico.id}/insumos`, {
        produtoId: produto.id,
        quantidade: Number(quantidade),
      });
      toastSuccess(
        atualizando ? 'Quantidade do insumo atualizada' : 'Insumo adicionado ao serviço',
      );
      onSaved();
    } catch (error) {
      setErro(parseApiError(error).message);
    } finally {
      setSalvando(false);
    }
  }

  const carregando = produtos.loading || search !== busca.trim();

  return (
    <Modal
      open
      title={`Adicionar insumo a ${servico.nome}`}
      initialFocusRef={buscaRef}
      onClose={() => {
        if (salvando) return;
        if (novoProduto) {
          setNovoProduto(false);
          requestAnimationFrame(() => buscaRef.current?.focus());
        } else onClose();
      }}
    >
      {novoProduto ? (
        <>
          <h4
            ref={tituloCadastro}
            tabIndex={-1}
            className="mb-3 text-sm font-semibold text-[#E4E4E7]"
          >
            Cadastrar produto
          </h4>
          <ProdutoForm
            rotuloSalvar="Cadastrar e selecionar"
            onCancel={() => {
              setNovoProduto(false);
              requestAnimationFrame(() => buscaRef.current?.focus());
            }}
            onSavingChange={setSalvando}
            onSaved={(novo) => {
              setProduto(novo);
              setBusca('');
              setNovoProduto(false);
              toastSuccess('Produto cadastrado e selecionado');
              requestAnimationFrame(() => quantidadeRef.current?.focus());
            }}
          />
        </>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void associar();
          }}
        >
          <fieldset disabled={salvando} className="min-w-0 space-y-3">
            <Input
              ref={buscaRef}
              label="Buscar produto"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome ou código"
            />
            {carregando ? (
              <p role="status" className="text-sm text-[#A1A1AA]">
                Buscando produtos…
              </p>
            ) : produtos.error ? (
              <p role="alert" className="text-sm text-red-300">
                Não foi possível buscar produtos.{' '}
                <button type="button" className="underline" onClick={() => void produtos.refetch()}>
                  Tentar novamente
                </button>
              </p>
            ) : (produtos.data?.data.length ?? 0) === 0 ? (
              <p className="text-sm text-[#A1A1AA]">
                {busca
                  ? 'Nenhum produto encontrado para essa busca.'
                  : 'Nenhum produto cadastrado.'}
              </p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {produtos.data?.data.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === produto?.id}
                    onClick={() => {
                      if (item.id === produto?.id) return;
                      const existente = insumos.find((insumo) => insumo.produtoId === item.id);
                      if (existente) setQuantidade(String(existente.quantidade));
                      else if (produto) setQuantidade('1');
                      setProduto(item);
                      setErro('');
                    }}
                    className={`w-full break-words rounded-lg px-3 py-2 text-left text-sm ${
                      item.id === produto?.id
                        ? 'bg-[#6366F1]/15 text-[#C7D2FE]'
                        : 'text-[#E4E4E7] hover:bg-[#18181F]'
                    }`}
                  >
                    {item.nome}
                    {item.sku && <span className="ml-2 text-xs text-[#A1A1AA]">{item.sku}</span>}
                  </button>
                ))}
              </div>
            )}
            {!carregando &&
              !produtos.error &&
              produtos.data &&
              produtos.data.total > produtos.data.data.length && (
                <p className="text-xs text-[#A1A1AA]">
                  Mostrando {produtos.data.data.length} de {produtos.data.total}. Busque pelo nome
                  ou código para encontrar outros produtos.
                </p>
              )}
            {podeCriarProduto && (
              <Button type="button" variant="secondary" onClick={() => setNovoProduto(true)}>
                + Cadastrar produto
              </Button>
            )}
            {produto && (
              <p role="status" className="break-words text-sm text-[#E4E4E7]">
                Selecionado: <strong>{produto.nome}</strong>
              </p>
            )}
            <Input
              ref={quantidadeRef}
              label="Unidades usadas por atendimento"
              type="number"
              min={1}
              step={1}
              required
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </fieldset>
          {erro && (
            <p role="alert" className="text-sm text-red-300">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" loading={salvando} disabled={!produto || !quantidade}>
              {atualizando ? 'Atualizar quantidade' : 'Adicionar insumo'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
