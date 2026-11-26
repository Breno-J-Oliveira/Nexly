'use client';

import { useRef, useState } from 'react';
import { BarcodeScanner } from '@/components/ui/BarcodeScanner';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { toastSuccess } from '@/components/ui/Toaster';
import { api } from '@/lib/api';
import { parseApiError } from '@/lib/errors';

export interface ProdutoCadastro {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  custoAtual: number | null;
  estoqueAtual: number;
  estoqueMinimo: number;
  categoria: string | null;
  dataVencimento: string | null;
  lote: string | null;
}

interface Props {
  produto?: ProdutoCadastro;
  rotuloSalvar?: string;
  onCancel: () => void;
  onSaved: (produto: ProdutoCadastro) => void;
  onSavingChange: (salvando: boolean) => void;
}

export function ProdutoForm({ produto, rotuloSalvar, onCancel, onSaved, onSavingChange }: Props) {
  const [form, setForm] = useState(() => ({
    nome: produto?.nome ?? '',
    sku: produto?.sku ?? '',
    preco: produto ? String(produto.preco) : '',
    custoAtual: produto?.custoAtual == null ? '' : String(produto.custoAtual),
    estoqueAtual: String(produto?.estoqueAtual ?? 0),
    estoqueMinimo: String(produto?.estoqueMinimo ?? 5),
    categoria: produto?.categoria ?? '',
    dataVencimento: produto?.dataVencimento?.slice(0, 10) ?? '',
    lote: produto?.lote ?? '',
  }));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const codigoRef = useRef<HTMLInputElement>(null);
  const detalhes = useRef<HTMLDetailsElement>(null);

  function atualizar(campo: keyof typeof form, valor: string) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function salvar() {
    if (salvando) return;
    if (form.nome.trim().length < 2 || (!produto && form.sku.trim().length < 2)) {
      setErro('Informe um nome e um código com pelo menos dois caracteres.');
      return;
    }
    setSalvando(true);
    onSavingChange(true);
    setErro('');
    try {
      const dados = {
        nome: form.nome.trim(),
        preco: Number(form.preco),
        custoAtual: form.custoAtual === '' ? null : Number(form.custoAtual),
        estoqueMinimo: Number(form.estoqueMinimo),
        categoria: form.categoria.trim() || null,
        dataVencimento: form.dataVencimento || null,
        lote: form.lote.trim() || null,
      };
      const { data } = produto
        ? await api.put<ProdutoCadastro>(`/produtos/${produto.id}`, dados)
        : await api.post<ProdutoCadastro>('/produtos', {
            ...dados,
            sku: form.sku.trim(),
            estoqueAtual: Number(form.estoqueAtual),
          });
      onSaved(data);
    } catch (error) {
      setErro(parseApiError(error).message);
    } finally {
      setSalvando(false);
      onSavingChange(false);
    }
  }

  return (
    <>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void salvar();
        }}
        onInvalidCapture={(event) => {
          if (detalhes.current?.contains(event.target as HTMLElement)) detalhes.current.open = true;
        }}
      >
        <fieldset disabled={salvando} className="min-w-0 space-y-4">
          <Input
            label="Nome do produto"
            required
            minLength={2}
            maxLength={120}
            value={form.nome}
            onChange={(e) => atualizar('nome', e.target.value)}
            placeholder="Ex.: Shampoo neutro"
          />
          <div className="space-y-2">
            <Input
              ref={codigoRef}
              label="Código do produto (SKU)"
              required
              minLength={2}
              maxLength={60}
              value={form.sku}
              onChange={(e) => atualizar('sku', e.target.value)}
              placeholder="Ex.: SHAMPOO-01"
              disabled={!!produto}
            />
            {!produto && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setScannerOpen(true)}>
                  <Icon name="barcode" size="sm" /> Ler código de barras
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!!form.sku}
                  onClick={() => {
                    const bytes = crypto.getRandomValues(new Uint8Array(8));
                    const codigo = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
                    atualizar('sku', `PROD-${codigo.join('').toUpperCase()}`);
                    codigoRef.current?.focus();
                  }}
                >
                  Gerar código
                </Button>
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Preço de venda (R$)"
              type="number"
              required
              min={0}
              max={99999999.99}
              step="0.01"
              value={form.preco}
              onChange={(e) => atualizar('preco', e.target.value)}
              placeholder="0,00"
            />
            {!produto && (
              <Input
                label="Unidades em estoque"
                type="number"
                required
                min={0}
                step={1}
                value={form.estoqueAtual}
                onChange={(e) => atualizar('estoqueAtual', e.target.value)}
              />
            )}
          </div>
          <details ref={detalhes} className="rounded-lg border border-white/10 p-3">
            <summary className="cursor-pointer text-sm font-medium text-[#E4E4E7]">
              Custo, alerta de estoque e validade
            </summary>
            <div className="mt-3 space-y-3">
              <Input
                label="Custo por unidade (R$)"
                type="number"
                min={0}
                max={99999999.99}
                step="0.01"
                value={form.custoAtual}
                onChange={(e) => atualizar('custoAtual', e.target.value)}
              />
              <p className="text-xs text-[#A1A1AA]">
                Informe o custo para calcular a margem nas próximas vendas.
              </p>
              <Input
                label="Quantidade mínima para o alerta de estoque"
                type="number"
                required
                min={0}
                step={1}
                value={form.estoqueMinimo}
                onChange={(e) => atualizar('estoqueMinimo', e.target.value)}
              />
              <Input
                label="Categoria"
                minLength={2}
                maxLength={60}
                value={form.categoria}
                onChange={(e) => atualizar('categoria', e.target.value)}
                placeholder="Ex.: Cosméticos"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Data de validade"
                  type="date"
                  value={form.dataVencimento}
                  onChange={(e) => atualizar('dataVencimento', e.target.value)}
                />
                <Input
                  label="Lote"
                  maxLength={60}
                  value={form.lote}
                  onChange={(e) => atualizar('lote', e.target.value)}
                />
              </div>
            </div>
          </details>
        </fieldset>
        {erro && (
          <p role="alert" className="text-sm text-red-300">
            {erro}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" loading={salvando}>
            {rotuloSalvar ?? (produto ? 'Salvar alterações' : 'Cadastrar produto')}
          </Button>
        </div>
      </form>
      {scannerOpen && (
        <BarcodeScanner
          isOpen
          onClose={() => setScannerOpen(false)}
          onScan={(code) => {
            atualizar('sku', code);
            toastSuccess('Código de barras preenchido');
          }}
        />
      )}
    </>
  );
}
