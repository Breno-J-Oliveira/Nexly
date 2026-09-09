'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toastSuccess } from '@/components/ui/Toaster';
import { maskCnpj, maskTelefone } from '@/lib/format';

type Secao = 'perfil' | 'horario' | 'usuarios' | 'notificacoes' | 'plano';

const SECOES: { id: Secao; label: string }[] = [
  { id: 'perfil', label: 'Perfil do Negócio' },
  { id: 'horario', label: 'Horário de Funcionamento' },
  { id: 'usuarios', label: 'Usuários' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'plano', label: 'Plano e Assinatura' },
];

const DIAS_SEMANA: { key: string; label: string }[] = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

const HORARIO_PADRAO: Record<string, { abre: string; fecha: string; aberto: boolean }> = {
  seg: { abre: '09:00', fecha: '19:00', aberto: true },
  ter: { abre: '09:00', fecha: '19:00', aberto: true },
  qua: { abre: '09:00', fecha: '19:00', aberto: true },
  qui: { abre: '09:00', fecha: '19:00', aberto: true },
  sex: { abre: '09:00', fecha: '19:00', aberto: true },
  sab: { abre: '09:00', fecha: '18:00', aberto: true },
  dom: { abre: '09:00', fecha: '18:00', aberto: false },
};

const NOTIFICACOES_PADRAO = {
  lembrete: { ativo: true, template: '' },
  confirmacao: { ativo: true },
  estoque: { ativo: false },
  venda: { ativo: true },
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
      style={{ backgroundColor: on ? '#6366F1' : '#3F3F46' }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
        style={{ left: on ? 'calc(100% - 18px)' : '2px', marginTop: 2 }}
      />
    </button>
  );
}
export default function ConfiguracoesPage() {
  const [secao, setSecao] = useState<Secao>('perfil');

  const [empresa, setEmpresa] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    emailContato: '',
    endereco: '',
    descricao: '',
    instagram: '',
    whatsapp: '',
  });
  const [horarios, setHorarios] = useState<
    Record<string, { abre: string; fecha: string; aberto: boolean }>
  >(HORARIO_PADRAO);
  const [notificacoes, setNotificacoes] = useState<any>(NOTIFICACOES_PADRAO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api
      .get('/configuracoes')
      .then((r) => {
        const d = r.data ?? {};
        setEmpresa({
          nome: d.nome ?? '',
          cnpj: d.cnpj ?? '',
          telefone: d.telefone ?? '',
          emailContato: d.emailContato ?? '',
          endereco: d.endereco ?? '',
          descricao: d.descricao ?? '',
          instagram: d.instagram ?? '',
          whatsapp: d.whatsapp ?? '',
        });
        if (d.horarios) setHorarios(d.horarios);
        if (d.notificacoes) setNotificacoes(d.notificacoes);
      })
      .catch(() => undefined);
  }, []);

  const setEmp = (k: keyof typeof empresa, v: string) =>
    setEmpresa((prev) => ({ ...prev, [k]: v }));

  const salvarPerfil = async () => {
    setSalvando(true);
    try {
      await api.put('/configuracoes', {
        nome: empresa.nome,
        cnpj: empresa.cnpj,
        telefone: empresa.telefone,
        emailContato: empresa.emailContato,
        endereco: empresa.endereco,
        descricao: empresa.descricao,
        instagram: empresa.instagram,
        whatsapp: empresa.whatsapp,
      });
      toastSuccess('Configurações salvas!');
    } finally {
      setSalvando(false);
    }
  };

  const salvarHorarios = async () => {
    setSalvando(true);
    try {
      await api.put('/configuracoes', { horarios });
      toastSuccess('Horários salvos!');
    } finally {
      setSalvando(false);
    }
  };

  const salvarNotificacoes = async () => {
    setSalvando(true);
    try {
      await api.put('/configuracoes', { notificacoes });
      toastSuccess('Notificações salvas!');
    } finally {
      setSalvando(false);
    }
  };

  const copiarSegunda = () => {
    const base = horarios.seg;
    if (!base) return;
    setHorarios((prev) => {
      const novo = { ...prev };
      DIAS_SEMANA.forEach((d) => {
        novo[d.key] = { ...base };
      });
      return novo;
    });
  };

  const setDia = (
    key: string,
    patch: Partial<{ abre: string; fecha: string; aberto: boolean }>,
  ) =>
    setHorarios((prev) => {
      const base =
        prev[key] ?? HORARIO_PADRAO.seg ?? { abre: '09:00', fecha: '19:00', aberto: false };
      return {
        ...prev,
        [key]: {
          abre: patch.abre ?? base.abre,
          fecha: patch.fecha ?? base.fecha,
          aberto: patch.aberto ?? base.aberto,
        },
      };
    });

  const setNotif = (key: string, patch: Record<string, unknown>) =>
    setNotificacoes((p: any) => ({ ...p, [key]: { ...(p?.[key] ?? {}), ...patch } }));

return (
    <div className="flex gap-6">
      {/* Nav lateral */}
      <div
        className="hidden w-[200px] shrink-0 md:block"
        style={{
          backgroundColor: '#0E0E12',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 12px',
        }}
      >
        <p className="mb-5 px-2 text-[14px] font-semibold" style={{ color: '#FAFAFA' }}>
          Configurações
        </p>
        <nav className="space-y-0.5">
          {SECOES.map((s) => {
            const isAtivo = secao === s.id;
            const base: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              height: 32,
              width: '100%',
              padding: '0 8px',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'color 150ms, background-color 150ms',
            };
            const estilo: React.CSSProperties = isAtivo
              ? { ...base, color: '#818CF8', backgroundColor: 'rgba(99,102,241,0.10)' }
              : { ...base, color: '#71717A' };
            if (s.id === 'usuarios') {
              return (
                <Link key={s.id} href="/usuarios" style={estilo} className="no-underline">
                  {s.label}
                </Link>
              );
            }
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSecao(s.id)}
                style={estilo}
                onMouseEnter={(e) => {
                  if (!isAtivo) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!isAtivo) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {s.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
{secao === 'perfil' && (
          <div>
            <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>
              Perfil do Negócio
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
              Informações públicas do seu negócio
            </p>

            <div
              className="mt-6 max-w-2xl rounded-xl p-6"
              style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex flex-col items-center">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full"
                  style={{ border: '1px dashed rgba(255,255,255,0.16)', backgroundColor: '#18181F' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <p className="mt-3 text-[12px]" style={{ color: '#6366F1' }}>
                  Fazer upload do logo
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: '#71717A' }}>
                  PNG ou JPG, máx 2MB
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nome do negócio *"
                  value={empresa.nome}
                  onChange={(e) => setEmp('nome', e.target.value)}
                  placeholder="Nome do seu negócio"
                />
                <Input
                  label="CNPJ"
                  value={empresa.cnpj}
                  onChange={(e) => setEmp('cnpj', maskCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                />
                <Input
                  label="Telefone"
                  value={empresa.telefone}
                  onChange={(e) => setEmp('telefone', maskTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
                <Input
                  label="E-mail de contato"
                  type="email"
                  value={empresa.emailContato}
                  onChange={(e) => setEmp('emailContato', e.target.value)}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Endereço"
                  value={empresa.endereco}
                  onChange={(e) => setEmp('endereco', e.target.value)}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium" style={{ color: '#A1A1AA' }}>
                  Descrição do negócio
                </label>
                <textarea
                  value={empresa.descricao}
                  onChange={(e) => setEmp('descricao', e.target.value)}
                  rows={3}
                  placeholder="Descreva seu negócio em poucas palavras..."
                  className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}
                />
              </div>
<div className="mt-6">
                <p
                  className="mb-3 border-t pt-4 text-[13px] font-medium"
                  style={{ color: '#71717A', borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  Redes Sociais
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium" style={{ color: '#A1A1AA' }}>
                      Instagram
                    </label>
                    <div
                      className="flex items-center rounded-lg border"
                      style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)' }}
                    >
                      <span className="px-3 text-sm" style={{ color: '#71717A' }}>
                        @
                      </span>
                      <input
                        value={empresa.instagram}
                        onChange={(e) => setEmp('instagram', e.target.value)}
                        placeholder="seu.negocio"
                        className="h-10 w-full bg-transparent pr-3 text-sm outline-none"
                        style={{ color: '#FAFAFA' }}
                      />
                    </div>
                  </div>
                  <Input
                    label="WhatsApp Business"
                    value={empresa.whatsapp}
                    onChange={(e) => setEmp('whatsapp', maskTelefone(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setEmpresa((p) => ({ ...p }))}
                >
                  Cancelar
                </Button>
                <Button onClick={() => void salvarPerfil()} loading={salvando}>
                  Salvar alterações
                </Button>
              </div>
            </div>
          </div>
        )}
{secao === 'horario' && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>
              Horário de Funcionamento
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
              Configure os dias e horários de atendimento
            </p>

            <div
              className="mt-6 rounded-xl p-6"
              style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="space-y-3">
                {DIAS_SEMANA.map((d) => {
                  const val = horarios[d.key] ?? { abre: '09:00', fecha: '19:00', aberto: false };
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      <Toggle
                        on={val.aberto}
                        onChange={() => setDia(d.key, { aberto: !val.aberto })}
                      />
                      <span className="w-28 text-[13px] font-medium" style={{ color: '#FAFAFA' }}>
                        {d.label}
                      </span>
                      <div
                        className="ml-auto flex items-center gap-2"
                        style={{ opacity: val.aberto ? 1 : 0.4 }}
                      >
                        <input
                          type="time"
                          value={val.abre}
                          disabled={!val.aberto}
                          onChange={(e) => setDia(d.key, { abre: e.target.value })}
                          className="h-9 rounded-lg border bg-transparent px-2 text-sm outline-none"
                          style={{
                            borderColor: 'rgba(255,255,255,0.10)',
                            color: '#FAFAFA',
                            cursor: val.aberto ? 'text' : 'not-allowed',
                          }}
                        />
                        <span style={{ color: '#71717A' }}>—</span>
                        <input
                          type="time"
                          value={val.fecha}
                          disabled={!val.aberto}
                          onChange={(e) => setDia(d.key, { fecha: e.target.value })}
                          className="h-9 rounded-lg border bg-transparent px-2 text-sm outline-none"
                          style={{
                            borderColor: 'rgba(255,255,255,0.10)',
                            color: '#FAFAFA',
                            cursor: val.aberto ? 'text' : 'not-allowed',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={copiarSegunda}
                className="mt-5 w-full rounded-lg border border-zinc-700 py-2 text-[13px] transition-colors hover:bg-white/5"
                style={{ color: '#A1A1AA' }}
              >
                Copiar horário de Segunda para todos os dias
              </button>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => void salvarHorarios()} loading={salvando}>
                  Salvar horários
                </Button>
              </div>
            </div>
          </div>
        )}
{secao === 'notificacoes' && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>
              Notificações
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
              Configure quando e como receber notificações
            </p>
            <div className="mt-6 space-y-4">
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: '#FAFAFA' }}>
                      Lembrete de agendamento
                    </p>
                    <p className="mt-0.5 text-[13px]" style={{ color: '#71717A' }}>
                      Notifica o cliente 24h antes do horário
                    </p>
                  </div>
                  <Toggle
                    on={notificacoes.lembrete?.ativo}
                    onChange={() =>
                      setNotif('lembrete', { ativo: !notificacoes.lembrete?.ativo })
                    }
                  />
                </div>
                {notificacoes.lembrete?.ativo && (
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium" style={{ color: '#A1A1AA' }}>
                      Template
                    </label>
                    <textarea
                      value={notificacoes.lembrete?.template ?? ''}
                      onChange={(e) => setNotif('lembrete', { template: e.target.value })}
                      rows={3}
                      placeholder="Olá {{nome}}! Lembrando do seu agendamento amanhã às {{hora}} com {{profissional}} para {{servico}}. Qualquer dúvida, entre em contato."
                      className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}
                    />
                    <button
                      type="button"
                      className="mt-2 text-[13px] font-medium hover:opacity-80"
                      style={{ color: '#6366F1' }}
                    >
                      Enviar mensagem de teste →
                    </button>
                  </div>
                )}
              </div>
              <div
                className="flex items-center justify-between rounded-xl p-5"
                style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: '#FAFAFA' }}>
                    Confirmação de agendamento
                  </p>
                  <p className="mt-0.5 text-[13px]" style={{ color: '#71717A' }}>
                    Enviado ao criar um novo agendamento
                  </p>
                </div>
                <Toggle
                  on={notificacoes.confirmacao?.ativo}
                  onChange={() =>
                    setNotif('confirmacao', { ativo: !notificacoes.confirmacao?.ativo })
                  }
                />
              </div>
<div
                className="flex items-center justify-between rounded-xl p-5"
                style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: '#FAFAFA' }}>
                    Alerta de estoque crítico
                  </p>
                  <p className="mt-0.5 text-[13px]" style={{ color: '#71717A' }}>
                    Quando produto ficar abaixo do mínimo
                  </p>
                </div>
                <Toggle
                  on={notificacoes.estoque?.ativo}
                  onChange={() => setNotif('estoque', { ativo: !notificacoes.estoque?.ativo })}
                />
              </div>
              <div
                className="flex items-center justify-between rounded-xl p-5"
                style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: '#FAFAFA' }}>
                    Nova venda realizada
                  </p>
                  <p className="mt-0.5 text-[13px]" style={{ color: '#71717A' }}>
                    Notificação interna ao finalizar uma venda
                  </p>
                </div>
                <Toggle
                  on={notificacoes.venda?.ativo}
                  onChange={() => setNotif('venda', { ativo: !notificacoes.venda?.ativo })}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void salvarNotificacoes()} loading={salvando}>
                  Salvar notificações
                </Button>
              </div>
            </div>
          </div>
        )}
{secao === 'plano' && (
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>
              Plano e Assinatura
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
              Gerencie seu plano e forma de pagamento
            </p>
            <div
              className="mt-6 rounded-xl p-6"
              style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#71717A' }}>
                    Plano atual
                  </p>
                  <p className="mt-1">
                    <span
                      className="rounded-md px-2 py-1 text-[13px] font-semibold"
                      style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
                    >
                      Pro
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: '#71717A' }}>
                    Próxima cobrança
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: '#A1A1AA' }}>
                    —
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="mt-5 text-[13px] font-medium opacity-60"
                style={{ color: '#6366F1' }}
              >
                Gerenciar assinatura →
              </button>
              <p
                className="mt-4 border-t pt-4 text-[12px]"
                style={{ color: '#71717A', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                Para integrar pagamentos, configure o gateway na seção de integrações.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
