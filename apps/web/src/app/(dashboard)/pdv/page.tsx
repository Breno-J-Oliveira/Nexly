'use client';

import { useApi } from '@/lib/useApi';
import { SelectField, erroDaAcao } from '@/components/gestao/GestaoUI';
import { PageToolbar } from '@/components/ui/PageToolbar';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { BarcodeScanner } from '@/components/ui/BarcodeScanner';
import { api } from '@/lib/api';
import { toastSuccess } from '@/components/ui/Toaster';
import { ClienteSelect } from './ClienteSelect';

interface Produto {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  estoqueAtual: number;
}
interface Item {
  produto: Produto;
  quantidade: number;
}

export default function PdvPage() {
  const tentativa = useRef<{ body: string; chave: string } | null>(null);
  const unidades = useApi<{ id: string; nome: string }[]>('/gestao/unidades');
  const [filialId, setFilialId] = useState(''),
    [recebido, setRecebido] = useState(false),
    [erroVenda, setErroVenda] = useState(''),
    [catalogoLoading, setCatalogoLoading] = useState(false);
  const [catalogo, setCatalogo] = useState<Produto[]>([]);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [mostrarPagamento, setMostrarPagamento] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [descontoTipo, setDescontoTipo] = useState<'R$' | '%'>('R$');
  const [descontoValor, setDescontoValor] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cupomCodigo, setCupomCodigo] = useState('');
  const [cupom, setCupom] = useState<{
    id: string;
    codigo: string;
    tipo: 'PERCENTUAL' | 'FIXO';
    valor: number;
  } | null>(null);
  const [cupomErro, setCupomErro] = useState<string | null>(null);
  const [aplicandoCupom, setAplicandoCupom] = useState(false);
  const [erroCatalogo, setErroCatalogo] = useState('');
  const [erroBusca, setErroBusca] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [tentativaBusca, setTentativaBusca] = useState(0);
  const [tentativaCatalogo, setTentativaCatalogo] = useState(0);
  const buscaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogo([]);
    setResultados([]);
    setCatalogoLoading(true);
    setErroCatalogo('');
    api
      .get<{ data: Produto[] }>(filialId ? `/gestao/catalogo-filial/${filialId}` : '/produtos', {
        params: filialId ? undefined : { limit: 100 },
        signal: controller.signal,
      })
      .then((r) => {
        if (!controller.signal.aborted) setCatalogo(r.data.data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setErroCatalogo('Não foi possível carregar os produtos desta unidade.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogoLoading(false);
      });
    return () => controller.abort();
  }, [filialId, tentativaCatalogo]);
  useEffect(() => {
    setResultados([]);
    setErroBusca(false);
    setBuscando(busca.trim().length >= 2);
    const controller = new AbortController();
    const t = setTimeout(() => {
      if (busca.trim().length < 2) {
        setBuscando(false);
        return;
      }
      if (filialId) {
        const term = busca.trim().toLocaleLowerCase('pt-BR');
        setResultados(
          catalogo.filter((p) => `${p.nome} ${p.sku}`.toLocaleLowerCase('pt-BR').includes(term)),
        );
        setBuscando(false);
        return;
      }
      api
        .get<{ data: Produto[] }>('/produtos', {
          params: { search: busca.trim(), limit: 10 },
          signal: controller.signal,
        })
        .then((r) => {
          if (!controller.signal.aborted) setResultados(r.data.data);
        })
        .catch(() => {
          if (!controller.signal.aborted) setErroBusca(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBuscando(false);
        });
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [busca, filialId, catalogo, tentativaBusca]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== '/' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target?.isContentEditable ||
        (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;
      event.preventDefault();
      buscaRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const adicionar = (produto: Produto): void => {
    if (finalizando || produto.estoqueAtual <= 0) return;
    setItens((prev) => {
      const existente = prev.find((i) => i.produto.id === produto.id);
      if (existente) {
        if (existente.quantidade >= produto.estoqueAtual) return prev;
        return prev.map((i) =>
          i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
    setResultados([]);
    setBusca('');
  };

  const mudarQuantidade = (id: string, delta: number): void => {
    setItens((prev) =>
      prev.map((i) =>
        i.produto.id === id
          ? {
              ...i,
              quantidade: Math.min(i.produto.estoqueAtual, Math.max(1, i.quantidade + delta)),
            }
          : i,
      ),
    );
  };

  const remover = (id: string): void => {
    setItens((prev) => prev.filter((i) => i.produto.id !== id));
  };

  const total = itens.reduce((acc, i) => acc + Number(i.produto.preco) * i.quantidade, 0);

  // Cálculo do desconto (máximo: $ total, nunca negativo).
  const descontoNumerico = Number(String(descontoValor).replace(',', '.'));
  const descontoInvalido =
    !Number.isFinite(descontoNumerico) ||
    descontoNumerico < 0 ||
    descontoNumerico > (descontoTipo === '%' ? 100 : total);
  const descontoSeguro = descontoInvalido ? 0 : descontoNumerico;
  const descontoAplicado =
    Math.round((descontoTipo === '%' ? (total * descontoSeguro) / 100 : descontoSeguro) * 100) /
    100;
  const descontoCupom =
    cupom?.tipo === 'PERCENTUAL'
      ? Math.min((total * cupom.valor) / 100, total)
      : Math.min(cupom?.valor ?? 0, total);
  const totalFinal = Math.max(0, total - descontoAplicado - descontoCupom);

  const finalizar = async (): Promise<void> => {
    if (finalizando || aplicandoCupom || descontoInvalido || !itens.length) return;
    setFinalizando(true);
    setErroVenda('');
    try {
      const body = {
        clienteId: clienteId || undefined,
        itens: itens.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
        formaPagamento,
        filialId: filialId || undefined,
        recebido,
        desconto: descontoAplicado > 0 ? Number(descontoAplicado.toFixed(2)) : undefined,
        cupomCodigo: cupom?.codigo,
      };
      const serialized = JSON.stringify(body);
      if (tentativa.current?.body !== serialized)
        tentativa.current = { body: serialized, chave: crypto.randomUUID() };
      const { data: venda } = await api.post<{ total: number | string }>('/vendas', {
        ...body,
        chaveOperacao: tentativa.current.chave,
      });
      tentativa.current = null;
      setCatalogo((prev) =>
        prev.map((p) => ({
          ...p,
          estoqueAtual:
            p.estoqueAtual - (itens.find((i) => i.produto.id === p.id)?.quantidade || 0),
        })),
      );
      setItens([]);
      setClienteId('');
      setSucesso(true);
      setMostrarPagamento(false);
      setFormaPagamento('Pix');
      setRecebido(false);
      setDescontoTipo('R$');
      setDescontoValor('');
      setCupom(null);
      setCupomCodigo('');
      setCupomErro(null);
      if (cupom) {
        toastSuccess(
          `Venda finalizada! Cupom ${cupom.codigo} usado (desconto de ${new Intl.NumberFormat(
            'pt-BR',
            { style: 'currency', currency: 'BRL' },
          ).format(descontoCupom)})`,
        );
      } else {
        toastSuccess(
          `Venda finalizada! ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(venda.total))} no ${formaPagamento}`,
        );
      }
      setTimeout(() => setSucesso(false), 3000);
    } catch (e) {
      setErroVenda(erroDaAcao(e));
    } finally {
      setFinalizando(false);
    }
  };

  const aplicarCupom = async (): Promise<void> => {
    if (!cupomCodigo.trim() || aplicandoCupom || finalizando) return;
    setAplicandoCupom(true);
    setCupomErro(null);
    try {
      const r = await api.post<{
        valido: boolean;
        id: string;
        codigo: string;
        tipo: 'PERCENTUAL' | 'FIXO';
        valor: number;
      }>('/cupons/validar', { codigo: cupomCodigo.trim() });
      setCupom(r.data);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setCupomErro(err?.response?.data?.message ?? 'Cupom inválido');
    } finally {
      setAplicandoCupom(false);
    }
  };

  const removerCupom = (): void => {
    setCupom(null);
    setCupomCodigo('');
    setCupomErro(null);
  };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy={finalizando}>
      <fieldset disabled={finalizando} className="contents">
        <div className="flex min-w-0 flex-col">
          <PageToolbar>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#FAFAFA]">Ponto de Venda</h2>
              <span className="text-xs text-[#71717A]" title="Total de produtos carregados">
                {(busca.trim().length >= 2 ? resultados : catalogo).length} produtos
              </span>
            </div>
          </PageToolbar>
          <div className="mb-4">
            <SelectField
              label="Estoque da venda"
              value={filialId}
              disabled={itens.length > 0 || finalizando}
              onChange={(e) => {
                setFilialId(e.target.value);
                setBusca('');
              }}
            >
              <option value="">Central</option>
              {unidades.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </SelectField>
            <p className="mt-2 text-xs text-[#A1A1AA]">
              Esvazie o carrinho para trocar a unidade. Até {filialId ? '500' : '100'} produtos
              carregados.
            </p>
            {unidades.error && (
              <p role="alert" className="mt-2 text-sm text-amber-200">
                Não foi possível carregar as filiais.{' '}
                <button type="button" className="underline" onClick={() => void unidades.refetch()}>
                  Tentar novamente
                </button>
              </p>
            )}
            {catalogoLoading && <p role="status">Carregando produtos…</p>}
            {erroCatalogo && (
              <p role="alert" className="mt-3 text-sm text-red-200">
                {erroCatalogo}{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setTentativaCatalogo((v) => v + 1)}
                >
                  Recarregar produtos
                </button>
              </p>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  ref={buscaRef}
                  aria-label="Buscar produto por nome ou SKU"
                  placeholder="Buscar por nome ou SKU... (pressione /)"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.10)] text-[#71717A] hover:text-[#FAFAFA]"
                title="Escanear código de barras"
              >
                <Icon name="barcode" size="lg" />
              </button>
            </div>
            {buscando && (
              <p role="status" className="mt-3 text-sm text-[#A1A1AA]">
                Buscando produtos…
              </p>
            )}
            {erroBusca && (
              <p role="alert" className="mt-3 text-sm text-red-200">
                Não foi possível buscar os produtos.{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setTentativaBusca((v) => v + 1)}
                >
                  Tentar busca novamente
                </button>
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
              {(busca.trim().length >= 2 ? resultados : catalogo).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex min-h-32 min-w-0 flex-col items-start justify-between rounded-lg border border-white/10 bg-[#111116] p-4 text-left hover:border-[#6366F1]/50 disabled:opacity-40"
                  disabled={
                    p.estoqueAtual <= (itens.find((i) => i.produto.id === p.id)?.quantidade || 0)
                  }
                  onClick={() => adicionar(p)}
                >
                  <div className="w-full min-w-0">
                    <p
                      className="line-clamp-2 break-words font-medium text-[#FAFAFA]"
                      title={p.nome}
                    >
                      {p.nome}
                    </p>
                    <p className="text-xs text-[#71717A]">Estoque: {p.estoqueAtual}</p>
                  </div>
                  <p className="font-semibold text-[#FAFAFA]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      Number(p.preco),
                    )}
                  </p>
                </button>
              ))}

              {/* Empty state: nenhuma busca iniciada */}
              {busca.trim().length < 2 &&
                catalogo.length === 0 &&
                !catalogoLoading &&
                !erroCatalogo && (
                  <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] bg-[#060608]/50 px-4 py-10 text-center">
                    <p className="text-sm text-[#A1A1AA]">
                      Digite o nome ou SKU do produto para começar
                    </p>
                    <p className="mt-1 text-xs text-[#52525B]">
                      A busca inicia automaticamente após 2 caracteres.
                    </p>
                  </div>
                )}

              {/* Empty state: busca sem resultado */}
              {busca.trim().length >= 2 &&
                resultados.length === 0 &&
                !buscando &&
                !erroBusca &&
                !catalogoLoading &&
                !erroCatalogo && (
                  <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] bg-[#060608]/50 px-4 py-10 text-center">
                    <p className="text-sm text-[#D4D4D8]">
                      Nenhum produto encontrado para “{busca.trim()}”
                    </p>
                    <p className="mt-1 text-xs text-[#52525B]">
                      Verifique a grafia ou cadastre o produto em Estoque.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-5">
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Carrinho</h2>
          <div className="mt-4 min-h-32 flex-1 overflow-y-auto pr-2">
            {itens.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] bg-[#060608]/50 px-4 py-10 text-center">
                <p className="text-sm text-[#A1A1AA]">Nenhum produto no carrinho</p>
                <p className="mt-1 text-xs text-[#52525B]">
                  Busque um produto à esquerda para iniciar a venda.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {itens.map((item) => (
                  <div
                    key={item.produto.id}
                    className="flex flex-col gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#060608] p-3"
                  >
                    <div className="flex justify-between">
                      <p className="min-w-0 break-words font-medium text-[#FAFAFA]">
                        {item.produto.nome}
                      </p>
                      <p className="shrink-0 pl-2 font-semibold text-[#FAFAFA]">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(item.produto.preco) * item.quantidade)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tooltip text="Diminuir quantidade">
                          <Button
                            variant="ghost"
                            className="h-6 w-6 p-0 text-[#A1A1AA]"
                            aria-label={`Diminuir quantidade de ${item.produto.nome}`}
                            disabled={item.quantidade <= 1}
                            onClick={() => mudarQuantidade(item.produto.id, -1)}
                          >
                            -
                          </Button>
                        </Tooltip>
                        <span className="text-sm text-[#FAFAFA]">{item.quantidade}</span>
                        <Tooltip text="Aumentar quantidade">
                          <Button
                            variant="ghost"
                            className="h-6 w-6 p-0 text-[#A1A1AA]"
                            aria-label={`Aumentar quantidade de ${item.produto.nome}`}
                            disabled={item.quantidade >= item.produto.estoqueAtual}
                            onClick={() => mudarQuantidade(item.produto.id, 1)}
                          >
                            +
                          </Button>
                        </Tooltip>
                      </div>
                      <Tooltip text="Remover item do carrinho">
                        <Button
                          variant="danger"
                          className="h-6 px-2 text-xs"
                          onClick={() => remover(item.produto.id)}
                        >
                          Remover
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-[rgba(255,255,255,0.08)] pt-4">
            <div className="mb-4">
              <ClienteSelect value={clienteId} onChange={setClienteId} />
            </div>
            <div className="flex justify-between text-lg font-bold text-[#FAFAFA]">
              <span>Total</span>
              <span>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  totalFinal,
                )}
              </span>
            </div>

            {/* Seção de pagamento — aparece após clique em "Continuar" */}
            {mostrarPagamento && (
              <div className="mt-4 rounded-lg border border-[rgba(255,255,255,0.08)] p-3">
                <label className="mb-4 flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={recebido}
                    onChange={(e) => setRecebido(e.target.checked)}
                  />
                  <span>
                    Já recebi o valor total
                    <span className="mt-1 block text-xs text-[#A1A1AA]">
                      Desmarcado: a venda ficará a receber no Financeiro.
                    </span>
                  </span>
                </label>
                <p className="mb-2 text-sm font-semibold text-[#E4E4E7]">Forma de pagamento</p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['Dinheiro', '💰'],
                      ['Pix', '⚡'],
                      ['Débito', '💳'],
                      ['Crédito', '💳'],
                    ] as const
                  ).map(([label, icon]) => {
                    const selecionado = formaPagamento === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={selecionado}
                        onClick={() => setFormaPagamento(label)}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors"
                        style={
                          selecionado
                            ? {
                                backgroundColor: 'rgba(99,102,241,0.15)',
                                border: '1px solid #6366F1',
                                color: '#818CF8',
                              }
                            : {
                                backgroundColor: '#18181F',
                                border: '1px solid rgba(255,255,255,0.10)',
                                color: '#A1A1AA',
                              }
                        }
                      >
                        <span>{icon}</span>
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="pdv-desconto" className="text-sm font-medium text-[#D4D4D8]">
                      Desconto
                    </label>
                    <div className="flex overflow-hidden rounded-md border border-[rgba(255,255,255,0.10)] text-xs">
                      {(['R$', '%'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setDescontoTipo(t)}
                          className="px-2.5 py-1 transition-colors"
                          style={
                            descontoTipo === t
                              ? { backgroundColor: '#6366F1', color: '#FFFFFF' }
                              : { color: '#A1A1AA' }
                          }
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    id="pdv-desconto"
                    type="number"
                    min={0}
                    max={descontoTipo === '%' ? 100 : total}
                    step="0.01"
                    aria-invalid={descontoInvalido}
                    aria-describedby={descontoInvalido ? 'pdv-desconto-erro' : undefined}
                    value={descontoValor}
                    onChange={(e) => setDescontoValor(e.target.value)}
                    placeholder={descontoTipo === '%' ? '0' : '0,00'}
                    className="w-full rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                  />
                  {descontoInvalido && (
                    <p id="pdv-desconto-erro" role="alert" className="mt-2 text-sm text-red-200">
                      Informe um desconto entre zero e{' '}
                      {descontoTipo === '%' ? '100%' : 'o total da venda'}.
                    </p>
                  )}
                  {descontoAplicado > 0 && (
                    <p className="mt-1 text-sm font-semibold text-red-400">
                      -{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(descontoAplicado)}
                    </p>
                  )}
                </div>

                <div className="mt-3">
                  <label
                    htmlFor="pdv-cupom"
                    className="mb-1 block text-sm font-medium text-[#D4D4D8]"
                  >
                    Cupom
                  </label>
                  {cupom ? (
                    <div className="flex items-center justify-between rounded-lg border border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.06)] px-3 py-2">
                      <span className="text-[13px] font-medium text-[#22C55E]">
                        Cupom {cupom.codigo} —{' '}
                        {cupom.tipo === 'PERCENTUAL'
                          ? `${cupom.valor}%`
                          : `R$ ${cupom.valor.toFixed(2)}`}{' '}
                        aplicado
                      </span>
                      <button
                        type="button"
                        onClick={removerCupom}
                        className="text-[#A1A1AA] hover:text-[#FAFAFA]"
                        aria-label="Remover cupom"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        id="pdv-cupom"
                        value={cupomCodigo}
                        onChange={(e) => setCupomCodigo(e.target.value)}
                        placeholder="Código do cupom"
                        className="min-w-0 flex-1 rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                      />
                      <Button
                        variant="secondary"
                        onClick={() => void aplicarCupom()}
                        loading={aplicandoCupom}
                        disabled={!cupomCodigo.trim()}
                      >
                        Aplicar
                      </Button>
                    </div>
                  )}
                  {cupomErro && <p className="mt-1 text-sm text-red-400">{cupomErro}</p>}
                  {cupom && (
                    <p className="mt-1 text-sm font-semibold text-red-400">
                      -{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(descontoCupom)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {erroVenda && (
              <p role="alert" className="mt-3 text-sm text-red-200">
                {erroVenda}
              </p>
            )}
            {!mostrarPagamento ? (
              <Button
                className="mt-4 w-full"
                disabled={itens.length === 0}
                onClick={() => setMostrarPagamento(true)}
                variant="primary"
              >
                Finalizar Venda
              </Button>
            ) : (
              <Tooltip
                text={
                  sucesso
                    ? 'Venda registrada com sucesso'
                    : `Finaliza a venda no ${formaPagamento} · ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`
                }
              >
                <Button
                  className="mt-4 w-full"
                  loading={finalizando}
                  disabled={
                    itens.length === 0 || !formaPagamento || descontoInvalido || aplicandoCupom
                  }
                  onClick={() => void finalizar()}
                  variant="primary"
                >
                  {sucesso
                    ? 'Venda Finalizada!'
                    : `Finalizar — ${new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(totalFinal)}`}
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        <BarcodeScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(code) => {
            setBusca(code);
            toastSuccess('Produto escaneado — buscando...');
          }}
        />
      </fieldset>
    </div>
  );
}
