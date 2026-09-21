'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { BarcodeScanner } from '@/components/ui/BarcodeScanner';
import { api } from '@/lib/api';
import { toastSuccess } from '@/components/ui/Toaster';

interface Produto {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  estoqueAtual: number;
}
interface Cliente {
  id: string;
  nome: string;
}
interface Item {
  produto: Produto;
  quantidade: number;
}

export default function PdvPage() {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [mostrarPagamento, setMostrarPagamento] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
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

  useEffect(() => {
    const t = setTimeout(() => {
      if (busca.trim().length >= 2) {
        api
          .get<{ data: Produto[] }>('/produtos', { params: { search: busca, limit: 10 } })
          .then((r) => setResultados(r.data.data))
          .catch(() => setResultados([]));
      } else {
        setResultados([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    api
      .get<{ data: Cliente[] }>('/clientes', { params: { limit: 100 } })
      .then((r) => setClientes(r.data.data))
      .catch(() => undefined);
  }, []);

  const adicionar = (produto: Produto): void => {
    setItens((prev) => {
      const existente = prev.find((i) => i.produto.id === produto.id);
      if (existente) {
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
        i.produto.id === id ? { ...i, quantidade: Math.max(1, i.quantidade + delta) } : i,
      ),
    );
  };

  const remover = (id: string): void => {
    setItens((prev) => prev.filter((i) => i.produto.id !== id));
  };

  const total = itens.reduce((acc, i) => acc + Number(i.produto.preco) * i.quantidade, 0);

  // Cálculo do desconto (máximo: $ total, nunca negativo).
  const descontoNumerico = Number(String(descontoValor).replace(',', '.')) || 0;
  const descontoAplicado =
    descontoTipo === '%'
      ? Math.min(total * (Math.min(descontoNumerico, 100) / 100), total)
      : Math.min(descontoNumerico, total);
  const descontoCupom =
    cupom?.tipo === 'PERCENTUAL'
      ? Math.min((total * cupom.valor) / 100, total)
      : Math.min(cupom?.valor ?? 0, total);
  const totalFinal = Math.max(0, total - descontoAplicado - descontoCupom);

  const finalizar = async (): Promise<void> => {
    setFinalizando(true);
    try {
      await api.post('/vendas', {
        clienteId: clienteId || undefined,
        itens: itens.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
        formaPagamento,
        desconto: descontoAplicado > 0 ? Number(descontoAplicado.toFixed(2)) : undefined,
        cupomCodigo: cupom?.codigo,
      });
      setItens([]);
      setClienteId('');
      setSucesso(true);
      setMostrarPagamento(false);
      setFormaPagamento('PIX');
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
        toastSuccess(`Venda finalizada! R$ ${totalFinal.toFixed(2)} no ${formaPagamento}`);
      }
      setTimeout(() => setSucesso(false), 3000);
    } finally {
      setFinalizando(false);
    }
  };

  const aplicarCupom = async (): Promise<void> => {
    if (!cupomCodigo.trim()) return;
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
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      <div className="flex flex-1 flex-col rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Produtos</h2>
          <span className="text-xs text-[#71717A]" title="Total de produtos carregados">
            {resultados.length}{' '}
            {resultados.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
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
          <div className="mt-4 space-y-2">
            {resultados.map((p) => (
              <div
                key={p.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#060608] p-3 hover:bg-[#18181F]"
                onClick={() => adicionar(p)}
              >
                <div>
                  <p className="font-medium text-[#FAFAFA]">{p.nome}</p>
                  <p className="text-xs text-[#71717A]">Estoque: {p.estoqueAtual}</p>
                </div>
                <p className="font-semibold text-[#FAFAFA]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    Number(p.preco),
                  )}
                </p>
              </div>
            ))}

            {/* Empty state: nenhuma busca iniciada */}
            {busca.trim().length < 2 && (
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
            {busca.trim().length >= 2 && resultados.length === 0 && (
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

      <div className="flex w-96 flex-col rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-5">
        <h2 className="text-xl font-semibold text-[#FAFAFA]">Venda Atual</h2>
        <div className="mt-4 flex-1 overflow-y-auto pr-2">
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
                    <p className="font-medium text-[#FAFAFA]">{item.produto.nome}</p>
                    <p className="font-semibold text-[#FAFAFA]">
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
            <label className="mb-1 block text-sm font-medium text-[#D4D4D8]">
              Cliente (opcional)
            </label>
            <select
              className="w-full rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
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
              <p className="mb-2 text-sm font-semibold text-[#E4E4E7]">Forma de pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['Dinheiro', '💰'],
                  ['Pix', '⚡'],
                  ['Débito', '💳'],
                  ['Crédito', '💳'],
                ] as const).map(([label, icon]) => {
                  const selecionado = formaPagamento === label;
                  return (
                    <button
                      key={label}
                      onClick={() => setFormaPagamento(label)}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors"
                      style={
                        selecionado
                          ? { backgroundColor: 'rgba(99,102,241,0.15)', border: '1px solid #6366F1', color: '#818CF8' }
                          : { backgroundColor: '#18181F', border: '1px solid rgba(255,255,255,0.10)', color: '#A1A1AA' }
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
                  <label className="text-sm font-medium text-[#D4D4D8]">Desconto</label>
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
                  type="number"
                  min={0}
                  value={descontoValor}
                  onChange={(e) => setDescontoValor(e.target.value)}
                  placeholder={descontoTipo === '%' ? '0' : '0,00'}
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                />
                {descontoAplicado > 0 && (
                  <p className="mt-1 text-sm font-semibold text-red-400">
                    - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(descontoAplicado)}
                  </p>
                )}
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-[#D4D4D8]">Cupom</label>
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
                      value={cupomCodigo}
                      onChange={(e) => setCupomCodigo(e.target.value)}
                      placeholder="Código do cupom"
                      className="flex-1 rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
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
                disabled={itens.length === 0 || !formaPagamento}
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
    </div>
  );
}
