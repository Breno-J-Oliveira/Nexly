'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toastSuccess, toastError } from '@/components/ui/Toaster';
import { formatarDataHora, maskCnpj, maskTelefone } from '@/lib/format';

type Secao =
  | 'perfil'
  | 'horario'
  | 'usuarios'
  | 'notificacoes'
  | 'cupons'
  | 'seguranca'
  | 'privacidade'
  | 'plano';

const SECOES: { id: Secao; label: string }[] = [
  { id: 'perfil', label: 'Perfil do Negócio' },
  { id: 'horario', label: 'Horário de Funcionamento' },
  { id: 'usuarios', label: 'Usuários' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'cupons', label: 'Cupons' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'privacidade', label: 'Privacidade' },
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

const TEMPLATE_LEMBRETE_PADRAO =
  'Olá {{nome}}! Lembrando do seu agendamento amanhã às {{hora}} com {{profissional}} para {{servico}}. Qualquer dúvida, entre em contato.';

const PLANO_LABEL: Record<string, string> = {
  FREE: 'Gratuito',
  BASIC: 'Essencial',
  PRO: 'Profissional',
  ENTERPRISE: 'Empresarial',
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
interface AuditLog {
  id: string;
  usuarioId: string | null;
  usuario: { nome: string; email: string } | null;
  acao: 'CRIAR' | 'EDITAR' | 'EXCLUIR' | 'LOGIN' | 'LOGOUT';
  recurso: string;
  recursoId: string | null;
  dadosAntigos: unknown;
  dadosNovos: unknown;
  ip: string | null;
  criadoEm: string;
}

const ACAO_INFO: Record<
  'CRIAR' | 'EDITAR' | 'EXCLUIR' | 'LOGIN' | 'LOGOUT',
  { label: string; color: string; bg: string }
> = {
  CRIAR: { label: 'Criar', color: '#60A5FA', bg: 'rgba(59,130,246,0.10)' },
  EDITAR: { label: 'Editar', color: '#FACC15', bg: 'rgba(234,179,8,0.10)' },
  EXCLUIR: { label: 'Excluir', color: '#F87171', bg: 'rgba(239,68,68,0.10)' },
  LOGIN: { label: 'Login', color: '#4ADE80', bg: 'rgba(34,197,94,0.10)' },
  LOGOUT: { label: 'Logout', color: '#A1A1AA', bg: 'rgba(255,255,255,0.06)' },
};

function acaoBadge(acao: string) {
  const info = ACAO_INFO[acao as keyof typeof ACAO_INFO] ?? ACAO_INFO.EDITAR;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: info.bg, color: info.color }}
    >
      {info.label}
    </span>
  );
}

function baixarBlob(blob: Blob, nome: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
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
    plano: 'FREE',
    lembretesAtivos: false,
    templateLembrete: '',
  });
  const [horarios, setHorarios] = useState<
    Record<string, { abre: string; fecha: string; aberto: boolean }>
  >(HORARIO_PADRAO);
  const [notificacoes, setNotificacoes] = useState<Record<string, { ativo?: boolean; template?: string }>>(
    NOTIFICACOES_PADRAO,
  );
  const [salvando, setSalvando] = useState(false);
  const [linkAgendamento, setLinkAgendamento] = useState<string | null>(null);
  const [carregandoLink, setCarregandoLink] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{ provider: string; enabled: boolean } | null>(null);
  const [cupons, setCupons] = useState<
    {
      id: string;
      codigo: string;
      tipo: 'PERCENTUAL' | 'FIXO';
      valor: number;
      usoAtual: number;
      usoMaximo: number | null;
      validade: string | null;
      ativo: boolean;
    }[]
  >([]);
  const [cupomModalAberto, setCupomModalAberto] = useState(false);
  const [cupomForm, setCupomForm] = useState({
    codigo: '',
    tipo: 'PERCENTUAL',
    valor: '',
    usoMaximo: '',
    validade: '',
  });
  const [salvandoCupom, setSalvandoCupom] = useState(false);
  const [cupomErro, setCupomErro] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFactorSenha, setTwoFactorSenha] = useState('');
  const [salvando2fa, setSalvando2fa] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPagina, setAuditPagina] = useState(1);
  const [auditAcao, setAuditAcao] = useState('');
  const [auditInicio, setAuditInicio] = useState('');
  const [auditFim, setAuditFim] = useState('');
  const [auditDetalhe, setAuditDetalhe] = useState<AuditLog | null>(null);
  const [clienteBusca, setClienteBusca] = useState('');
  const [clientesBusca, setClientesBusca] = useState<{ id: string; nome: string }[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<{ id: string; nome: string } | null>(null);
  const [anonimizarSenha, setAnonimizarSenha] = useState('');
  const [exclusaoStatus, setExclusaoStatus] = useState<{ emExclusao: boolean; executarEm?: string } | null>(null);
  const [exclusaoEtapa, setExclusaoEtapa] = useState(0);
  const [exclusaoConfirmacao, setExclusaoConfirmacao] = useState('');
  const [exclusaoSenha, setExclusaoSenha] = useState('');
  const [privacidadeSalvando, setPrivacidadeSalvando] = useState(false);

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
          plano: d.plano ?? 'FREE',
          lembretesAtivos: d.lembretesAtivos ?? false,
          templateLembrete: d.templateLembrete ?? '',
        });
        if (d.horarios) setHorarios(d.horarios as Record<string, { abre: string; fecha: string; aberto: boolean }>);
        if (d.notificacoes) setNotificacoes(d.notificacoes as Record<string, { ativo?: boolean; template?: string }>);
      })
      .catch(() => undefined);
    api
      .get<{ provider: string; enabled: boolean }>('/whatsapp/status')
      .then((r) => setWhatsappStatus(r.data ?? null))
      .catch(() => setWhatsappStatus({ provider: 'disabled', enabled: false }));
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

/** Busca (e gera na primeira vez) o link público de agendamento. */
  const carregarLinkAgendamento = async (): Promise<void> => {
    if (linkAgendamento) return;
    setCarregandoLink(true);
    try {
      const r = await api.get<{ token: string | null }>('/configuracoes/link-agendamento');
      const token = r.data?.token;
      if (!token) {
        toastError('Não foi possível gerar o link de agendamento');
        return;
      }
      setLinkAgendamento(`${window.location.origin}/booking/${token}`);
    } catch {
      toastError('Não foi possível gerar o link de agendamento');
    } finally {
      setCarregandoLink(false);
    }
  };

  const copiarLinkAgendamento = async (): Promise<void> => {
    if (!linkAgendamento) return;
    try {
      await navigator.clipboard.writeText(linkAgendamento);
      toastSuccess('Link copiado!');
    } catch {
      toastError('Não foi possível copiar o link');
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
      await api.patch('/configuracoes/notificacoes', {
        lembretesAtivos: empresa.lembretesAtivos,
        templateLembrete: empresa.templateLembrete,
      });
      toastSuccess('Notificações salvas!');
    } finally {
      setSalvando(false);
    }
  };

  const previewLembrete = useMemo(() => {
    const t = empresa.templateLembrete || TEMPLATE_LEMBRETE_PADRAO;
    return t
      .replace(/\{\{nome\}\}/g, 'Maria Fernanda')
      .replace(/\{\{hora\}\}/g, '14:30')
      .replace(/\{\{profissional\}\}/g, 'Ana Paula')
      .replace(/\{\{servico\}\}/g, 'Escova Progressiva');
  }, [empresa.templateLembrete]);

  const enviarTesteWhatsapp = async () => {
    setSalvando(true);
    try {
      await api.post('/whatsapp/test', {
        phone: empresa.telefone || empresa.whatsapp || '5511999999999',
        message: previewLembrete,
      });
      toastSuccess('Mensagem de teste enviada!');
    } catch {
      toastError('Não foi possível enviar a mensagem de teste');
    } finally {
      setSalvando(false);
    }
  };

  const carregarCupons = async (): Promise<void> => {
    const r = await api.get<typeof cupons>('/cupons');
    setCupons(r.data ?? []);
  };

  useEffect(() => {
    if (secao !== 'cupons') return;
    void carregarCupons().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secao]);

  const criarCupom = async (): Promise<void> => {
    setSalvandoCupom(true);
    setCupomErro(null);
    try {
      await api.post('/cupons', {
        codigo: cupomForm.codigo,
        tipo: cupomForm.tipo,
        valor: Number(cupomForm.valor),
        usoMaximo: cupomForm.usoMaximo ? Number(cupomForm.usoMaximo) : undefined,
        validade: cupomForm.validade || undefined,
      });
      setCupomModalAberto(false);
      setCupomForm({ codigo: '', tipo: 'PERCENTUAL', valor: '', usoMaximo: '', validade: '' });
      await carregarCupons();
      toastSuccess('Cupom criado!');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setCupomErro(err?.response?.data?.message ?? 'Erro ao criar cupom');
    } finally {
      setSalvandoCupom(false);
    }
  };

  const toggleCupom = async (c: { id: string; ativo: boolean }): Promise<void> => {
    await api.patch(`/cupons/${c.id}`, { ativo: !c.ativo });
    await carregarCupons();
  };

  const excluirCupom = async (c: { id: string; codigo: string }): Promise<void> => {
    if (!confirm(`Excluir o cupom "${c.codigo}"?`)) return;
    await api.delete(`/cupons/${c.id}`);
    await carregarCupons();
  };

  const carregar2fa = async (): Promise<void> => {
    const r = await api.get<{ enabled: boolean }>('/auth/2fa/status');
    setTwoFactorEnabled(r.data.enabled);
  };

  useEffect(() => {
    if (secao !== 'seguranca') return;
    void carregar2fa().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secao]);

  const iniciar2fa = async (): Promise<void> => {
    const r = await api.get<{ qrCodeUrl: string; secret: string }>('/auth/2fa/setup');
    setQrCodeUrl(r.data.qrCodeUrl);
  };

  const ativar2fa = async (): Promise<void> => {
    setSalvando2fa(true);
    try {
      const r = await api.post<{ backupCodes: string[] }>('/auth/2fa/enable', {
        code: twoFactorCode,
      });
      setBackupCodes(r.data.backupCodes);
      setTwoFactorEnabled(true);
      setQrCodeUrl(null);
      setTwoFactorCode('');
      toastSuccess('2FA ativado!');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err?.response?.data?.message ?? 'Código inválido');
    } finally {
      setSalvando2fa(false);
    }
  };

  const desativar2fa = async (): Promise<void> => {
    setSalvando2fa(true);
    try {
      await api.post('/auth/2fa/disable', { password: twoFactorSenha });
      setTwoFactorEnabled(false);
      setTwoFactorSenha('');
      setBackupCodes([]);
      toastSuccess('2FA desativado!');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err?.response?.data?.message ?? 'Senha incorreta');
    } finally {
      setSalvando2fa(false);
    }
  };

  const carregarAudit = async (): Promise<void> => {
    const r = await api.get<{ data: AuditLog[]; total: number }>('/audit/logs', {
      params: {
        pagina: auditPagina,
        limite: 25,
        acao: auditAcao || undefined,
        inicio: auditInicio || undefined,
        fim: auditFim || undefined,
      },
    });
    setAuditLogs(r.data.data);
    setAuditTotal(r.data.total);
  };

  useEffect(() => {
    if (secao !== 'seguranca') return;
    void carregarAudit().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secao, auditPagina, auditAcao, auditInicio, auditFim]);

  const buscarClientes = async (): Promise<void> => {
    if (clienteBusca.trim().length < 2) {
      setClientesBusca([]);
      return;
    }
    const r = await api.get<{ data: { id: string; nome: string }[] }>('/clientes', {
      params: { search: clienteBusca, limit: 10 },
    });
    setClientesBusca(r.data.data);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      void buscarClientes();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteBusca]);

  const exportarDados = async (): Promise<void> => {
    const res = await api.get('/lgpd/exportar', { responseType: 'blob' });
    baixarBlob(res.data as Blob, `nexly-export-${Date.now()}.json`);
  };

  const exportarCliente = async (): Promise<void> => {
    if (!clienteSelecionado) return;
    const res = await api.get(`/lgpd/exportar/cliente/${clienteSelecionado.id}`, {
      responseType: 'blob',
    });
    baixarBlob(res.data as Blob, `nexly-cliente-${clienteSelecionado.id.slice(0, 8)}.json`);
  };

  const anonimizarCliente = async (): Promise<void> => {
    if (!clienteSelecionado) return;
    setPrivacidadeSalvando(true);
    try {
      await api.post(`/lgpd/anonimizar/cliente/${clienteSelecionado.id}`, {
        password: anonimizarSenha,
      });
      setClienteSelecionado(null);
      setAnonimizarSenha('');
      toastSuccess('Cliente anonimizado!');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err?.response?.data?.message ?? 'Senha incorreta');
    } finally {
      setPrivacidadeSalvando(false);
    }
  };

  const carregarStatusExclusao = async (): Promise<void> => {
    const r = await api.get<{ emExclusao: boolean; executarEm?: string }>(
      '/lgpd/status-exclusao',
    );
    setExclusaoStatus(r.data);
  };

  useEffect(() => {
    if (secao !== 'privacidade') return;
    void carregarStatusExclusao().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secao]);

  const solicitarExclusao = async (): Promise<void> => {
    setPrivacidadeSalvando(true);
    try {
      const r = await api.delete<{ agendadaParaExclusaoEm: string }>('/lgpd/excluir-conta', {
        data: { password: exclusaoSenha, confirmacao: exclusaoConfirmacao },
      });
      setExclusaoStatus({ emExclusao: true, executarEm: r.data.agendadaParaExclusaoEm });
      setExclusaoEtapa(0);
      setExclusaoSenha('');
      setExclusaoConfirmacao('');
      toastSuccess('Exclusão agendada!');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err?.response?.data?.message ?? 'Erro ao agendar exclusão');
    } finally {
      setPrivacidadeSalvando(false);
    }
  };

  const cancelarExclusao = async (): Promise<void> => {
    await api.delete('/lgpd/cancelar-exclusao');
    setExclusaoStatus({ emExclusao: false });
    toastSuccess('Exclusão cancelada!');
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

  const setNotif = (key: string, patch: { ativo?: boolean; template?: string }) =>
    setNotificacoes((p) => ({ ...p, [key]: { ...(p?.[key] ?? {}), ...patch } }));

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
                  <Icon name="camera" className="text-[#71717A]" size="lg" />
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

              {/* Link público de agendamento */}
              <div
                className="mt-6 border-t pt-5"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <p className="text-[13px] font-medium" style={{ color: '#71717A' }}>
                  Link de agendamento
                </p>
                <p className="mt-1 text-[12px]" style={{ color: '#52525B' }}>
                  Compartilhe com seus clientes para que eles agendem sozinhos, sem precisar
                  entrar em contato.
                </p>

                {linkAgendamento ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      readOnly
                      value={linkAgendamento}
                      onFocus={(e) => e.currentTarget.select()}
                      className="h-10 w-full rounded-lg border px-3 text-sm outline-none"
                      style={{
                        backgroundColor: '#0C0C10',
                        borderColor: 'rgba(255,255,255,0.10)',
                        color: '#A1A1AA',
                      }}
                    />
                    <Button variant="secondary" onClick={() => void copiarLinkAgendamento()}>
                      Copiar
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <Button onClick={() => void carregarLinkAgendamento()} loading={carregandoLink}>
                      Gerar link de agendamento
                    </Button>
                  </div>
                )}
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
                className="mt-5 w-full rounded-lg border border-[rgba(255,255,255,0.10)] py-2 text-[13px] transition-colors hover:bg-white/5"
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
                      Lembretes automáticos (WhatsApp)
                    </p>
                    <p className="mt-0.5 text-[13px]" style={{ color: '#71717A' }}>
                      Envia lembrete ao cliente na véspera do agendamento
                    </p>
                    <p className="mt-1 text-[12px]" style={{ color: '#71717A' }}>
                      Conexão:{' '}
                      <span style={{ color: whatsappStatus?.enabled ? '#22C55E' : '#EF4444' }}>
                        {whatsappStatus?.enabled ? '● Conectado' : '● Desconectado'}
                      </span>
                    </p>
                  </div>
                  <Toggle
                    on={empresa.lembretesAtivos}
                    onChange={() => setEmpresa((p) => ({ ...p, lembretesAtivos: !p.lembretesAtivos }))}
                  />
                </div>
                {empresa.lembretesAtivos && (
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium" style={{ color: '#A1A1AA' }}>
                      Template
                    </label>
                    <textarea
                      value={empresa.templateLembrete}
                      onChange={(e) => setEmpresa((p) => ({ ...p, templateLembrete: e.target.value }))}
                      rows={3}
                      placeholder={TEMPLATE_LEMBRETE_PADRAO}
                      className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}
                    />
                    <p className="mb-1 mt-3 text-[12px] font-medium" style={{ color: '#71717A' }}>
                      Preview
                    </p>
                    <div
                      className="rounded-lg px-3 py-2 text-[13px]"
                      style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.10)', color: '#A1A1AA' }}
                    >
                      {previewLembrete}
                    </div>
                    <button
                      type="button"
                      onClick={() => void enviarTesteWhatsapp()}
                      className="mt-3 text-[13px] font-medium hover:opacity-80"
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
                  on={notificacoes.confirmacao?.ativo ?? false}
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
                  on={notificacoes.estoque?.ativo ?? false}
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
                  on={notificacoes.venda?.ativo ?? false}
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
                      className="rounded-md px-2 py-1 text-[13px] font-semibold uppercase"
                      style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
                    >
                      {PLANO_LABEL[empresa.plano] ?? empresa.plano}
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

        {secao === 'cupons' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>
                  Cupons
                </h2>
                <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
                  Crie e gerencie cupons de desconto
                </p>
              </div>
              <Button
                onClick={() => {
                  setCupomErro(null);
                  setCupomModalAberto(true);
                }}
              >
                + Criar cupom
              </Button>
            </div>

            <div
              className="mt-6 overflow-hidden rounded-xl"
              style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <table className="w-full text-left text-[13px]">
                <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <tr>
                    <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Código</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Tipo</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Valor</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Usos</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Validade</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {cupons.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#71717A' }}>
                        Nenhum cupom cadastrado.
                      </td>
                    </tr>
                  )}
                  {cupons.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#FAFAFA' }}>
                        {c.codigo}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>
                        {c.tipo === 'PERCENTUAL' ? 'Percentual' : 'Fixo'}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#FAFAFA' }}>
                        {c.tipo === 'PERCENTUAL'
                          ? `${c.valor}%`
                          : `R$ ${Number(c.valor).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>
                        {c.usoAtual}
                        {c.usoMaximo ? `/${c.usoMaximo}` : ''}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>
                        {c.validade ? new Date(c.validade).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: c.ativo
                              ? 'rgba(34,197,94,0.10)'
                              : 'rgba(255,255,255,0.06)',
                            color: c.ativo ? '#4ADE80' : '#71717A',
                          }}
                        >
                          {c.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          className="mr-1 text-xs"
                          onClick={() => void toggleCupom(c)}
                        >
                          {c.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-xs text-red-400"
                          onClick={() => void excluirCupom(c)}
                        >
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {cupomModalAberto && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div className="w-full max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-6">
                  <h3 className="text-lg font-semibold text-[#FAFAFA]">Novo cupom</h3>
                  <div className="mt-4 space-y-3">
                    <Input
                      label="Código"
                      value={cupomForm.codigo}
                      onChange={(e) => setCupomForm({ ...cupomForm, codigo: e.target.value })}
                      placeholder="Ex: BEMVINDO10"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#A1A1AA]">
                          Tipo
                        </label>
                        <select
                          value={cupomForm.tipo}
                          onChange={(e) =>
                            setCupomForm({
                              ...cupomForm,
                              tipo: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#0C0C10] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                        >
                          <option value="PERCENTUAL">Percentual (%)</option>
                          <option value="FIXO">Fixo (R$)</option>
                        </select>
                      </div>
                      <Input
                        label={cupomForm.tipo === 'PERCENTUAL' ? 'Valor (%)' : 'Valor (R$)'}
                        type="number"
                        min={0}
                        step="0.01"
                        value={cupomForm.valor}
                        onChange={(e) => setCupomForm({ ...cupomForm, valor: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Uso máximo (opcional)"
                        type="number"
                        min={1}
                        value={cupomForm.usoMaximo}
                        onChange={(e) =>
                          setCupomForm({ ...cupomForm, usoMaximo: e.target.value })
                        }
                      />
                      <Input
                        label="Validade (opcional)"
                        type="date"
                        value={cupomForm.validade}
                        onChange={(e) =>
                          setCupomForm({ ...cupomForm, validade: e.target.value })
                        }
                      />
                    </div>
                    {cupomErro && <p className="text-sm text-red-400">{cupomErro}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="secondary" onClick={() => setCupomModalAberto(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => void criarCupom()}
                        loading={salvandoCupom}
                        disabled={!cupomForm.codigo || !cupomForm.valor}
                      >
                        Criar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {secao === 'seguranca' && (
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>
              Segurança
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
              Autenticação de dois fatores (2FA)
            </p>

            <div
              className="mt-6 rounded-xl p-5"
              style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: '#FAFAFA' }}>
                    Autenticação de dois fatores
                  </p>
                  <p className="mt-0.5 text-[13px]" style={{ color: '#71717A' }}>
                    Adicione uma camada extra de segurança com seu app autenticador
                  </p>
                </div>
                {twoFactorEnabled ? (
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: 'rgba(34,197,94,0.10)', color: '#4ADE80' }}
                  >
                    2FA ativo
                  </span>
                ) : (
                  <Button onClick={() => void iniciar2fa()}>Ativar</Button>
                )}
              </div>

              {!twoFactorEnabled && qrCodeUrl && (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <img src={qrCodeUrl} alt="QR code 2FA" className="h-48 w-48 rounded-lg" />
                  <p className="text-[13px]" style={{ color: '#71717A' }}>
                    Escaneie com Google Authenticator ou Authy
                  </p>
                  <div className="w-full">
                    <Input
                      label="Código do app"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                    />
                  </div>
                  <Button
                    onClick={() => void ativar2fa()}
                    loading={salvando2fa}
                    disabled={twoFactorCode.length < 6}
                    className="w-full"
                  >
                    Ativar 2FA
                  </Button>
                </div>
              )}

              {twoFactorEnabled && backupCodes.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[13px] font-medium" style={{ color: '#A1A1AA' }}>
                    Códigos de backup (guarde em local seguro):
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {backupCodes.map((c) => (
                      <span
                        key={c}
                        className="rounded-md px-2 py-1 text-center font-mono text-xs"
                        style={{ backgroundColor: '#0C0C10', color: '#A1A1AA' }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {twoFactorEnabled && (
                <div className="mt-4 border-t border-[rgba(255,255,255,0.06)] pt-4">
                  <Input
                    label="Senha atual para desativar"
                    type="password"
                    value={twoFactorSenha}
                    onChange={(e) => setTwoFactorSenha(e.target.value)}
                    placeholder="••••••••"
                  />
                  <Button
                    variant="danger"
                    onClick={() => void desativar2fa()}
                    loading={salvando2fa}
                    disabled={!twoFactorSenha}
                    className="mt-2"
                  >
                    Desativar 2FA
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-8">
              <h3 className="text-[16px] font-semibold" style={{ color: '#FAFAFA' }}>
                Log de atividades
              </h3>
              <p className="mt-1 text-[13px]" style={{ color: '#71717A' }}>
                Registro de operações de escrita realizadas no sistema
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <select
                  value={auditAcao}
                  onChange={(e) => {
                    setAuditPagina(1);
                    setAuditAcao(e.target.value);
                  }}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: '#111116',
                    borderColor: 'rgba(255,255,255,0.10)',
                    color: '#FAFAFA',
                  }}
                >
                  <option value="">Todas as ações</option>
                  <option value="CRIAR">Criar</option>
                  <option value="EDITAR">Editar</option>
                  <option value="EXCLUIR">Excluir</option>
                  <option value="LOGIN">Login</option>
                  <option value="LOGOUT">Logout</option>
                </select>
                <input
                  type="date"
                  value={auditInicio}
                  onChange={(e) => {
                    setAuditPagina(1);
                    setAuditInicio(e.target.value);
                  }}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: '#111116',
                    borderColor: 'rgba(255,255,255,0.10)',
                    color: '#FAFAFA',
                  }}
                />
                <input
                  type="date"
                  value={auditFim}
                  onChange={(e) => {
                    setAuditPagina(1);
                    setAuditFim(e.target.value);
                  }}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: '#111116',
                    borderColor: 'rgba(255,255,255,0.10)',
                    color: '#FAFAFA',
                  }}
                />
              </div>

              <div
                className="mt-4 overflow-hidden rounded-xl"
                style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <table className="w-full text-left text-[13px]">
                  <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <tr>
                      <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Data/hora</th>
                      <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Usuário</th>
                      <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Ação</th>
                      <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Recurso</th>
                      <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center" style={{ color: '#71717A' }}>
                          Nenhum evento registrado.
                        </td>
                      </tr>
                    )}
                    {auditLogs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setAuditDetalhe(log)}
                        className="cursor-pointer hover:bg-[#18181F]/30"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>
                          {formatarDataHora(log.criadoEm)}
                        </td>
                        <td className="px-4 py-3" style={{ color: '#FAFAFA' }}>
                          {log.usuario?.nome ?? '—'}
                        </td>
                        <td className="px-4 py-3">{acaoBadge(log.acao)}</td>
                        <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>
                          {log.recurso}
                          {log.recursoId ? ` #${log.recursoId.slice(0, 8)}` : ''}
                        </td>
                        <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>
                          {log.ip ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="mt-3 flex items-center justify-between text-[13px]"
                style={{ color: '#71717A' }}
              >
                <span>
                  Mostrando {auditLogs.length === 0 ? 0 : (auditPagina - 1) * 25 + 1}–
                  {Math.min(auditPagina * 25, auditTotal)} de {auditTotal} eventos
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={auditPagina <= 1}
                    onClick={() => setAuditPagina((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={auditPagina * 25 >= auditTotal}
                    onClick={() => setAuditPagina((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {secao === 'privacidade' && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>
              Privacidade
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
              Seus dados e os direitos do titular (LGPD)
            </p>

            {exclusaoStatus?.emExclusao && (
              <div
                className="mt-4 rounded-xl border p-4"
                style={{
                  borderColor: 'rgba(234,179,8,0.3)',
                  backgroundColor: 'rgba(234,179,8,0.06)',
                }}
              >
                <p className="text-sm" style={{ color: '#EAB308' }}>
                  Exclusão agendada para{' '}
                  {exclusaoStatus.executarEm
                    ? new Date(exclusaoStatus.executarEm).toLocaleDateString('pt-BR')
                    : ''}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => void cancelarExclusao()}
                  className="mt-2"
                >
                  Cancelar exclusão
                </Button>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[14px] font-semibold" style={{ color: '#FAFAFA' }}>
                  Meus dados
                </p>
                <p className="mt-0.5 text-[13px]" style={{ color: '#71717A' }}>
                  Exporte todos os dados da sua empresa em JSON
                </p>
                <Button
                  variant="secondary"
                  onClick={() => void exportarDados()}
                  className="mt-3"
                >
                  Exportar todos os dados
                </Button>
              </div>

              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[14px] font-semibold" style={{ color: '#FAFAFA' }}>
                  Dados de um cliente
                </p>
                <p className="mt-0.5 text-[13px]" style={{ color: '#71717A' }}>
                  Exportar ou anonimizar os dados de um cliente específico
                </p>
                <div className="mt-3">
                  <Input
                    label="Buscar cliente"
                    value={clienteBusca}
                    onChange={(e) => setClienteBusca(e.target.value)}
                    placeholder="Digite o nome..."
                  />
                  {clientesBusca.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0C0C10]">
                      {clientesBusca.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClienteSelecionado(c);
                            setClienteBusca('');
                            setClientesBusca([]);
                            setAnonimizarSenha('');
                          }}
                          className="flex w-full px-3 py-2 text-left text-sm hover:bg-[#18181F]"
                          style={{ color: '#FAFAFA' }}
                        >
                          {c.nome}
                        </button>
                      ))}
                    </div>
                  )}
                  {clienteSelecionado && (
                    <div className="mt-2 rounded-lg border border-[rgba(255,255,255,0.08)] p-3">
                      <p className="text-sm" style={{ color: '#FAFAFA' }}>
                        {clienteSelecionado.nome}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button variant="secondary" onClick={() => void exportarCliente()}>
                          Exportar
                        </Button>
                        <Button variant="danger" onClick={() => setAnonimizarSenha(' ')}>
                          Anonimizar
                        </Button>
                      </div>
                      {anonimizarSenha !== '' && (
                        <div className="mt-2">
                          <Input
                            label="Senha para confirmar"
                            type="password"
                            value={anonimizarSenha.trim() ? anonimizarSenha : ''}
                            onChange={(e) => setAnonimizarSenha(e.target.value)}
                            placeholder="••••••••"
                          />
                          <Button
                            variant="danger"
                            onClick={() => void anonimizarCliente()}
                            loading={privacidadeSalvando}
                            disabled={!anonimizarSenha.trim()}
                            className="mt-2"
                          >
                            Confirmar anonimização
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div
                className="rounded-xl border p-5"
                style={{
                  borderColor: 'rgba(239,68,68,0.3)',
                  backgroundColor: 'rgba(239,68,68,0.06)',
                }}
              >
                <p className="text-[14px] font-semibold" style={{ color: '#EF4444' }}>
                  Zona de perigo
                </p>
                <p className="mt-0.5 text-[13px]" style={{ color: '#A1A1AA' }}>
                  A exclusão da conta é agendada em 30 dias, conforme LGPD
                </p>
                {exclusaoEtapa === 0 ? (
                  <Button variant="danger" onClick={() => setExclusaoEtapa(1)} className="mt-3">
                    Excluir conta
                  </Button>
                ) : (
                  <div className="mt-3 space-y-3">
                    <p className="text-[13px]" style={{ color: '#A1A1AA' }}>
                      Digite <strong>EXCLUIR MINHA CONTA</strong> e sua senha para confirmar:
                    </p>
                    <Input
                      label="Confirmação"
                      value={exclusaoConfirmacao}
                      onChange={(e) => setExclusaoConfirmacao(e.target.value)}
                      placeholder="EXCLUIR MINHA CONTA"
                    />
                    <Input
                      label="Senha"
                      type="password"
                      value={exclusaoSenha}
                      onChange={(e) => setExclusaoSenha(e.target.value)}
                      placeholder="••••••••"
                    />
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setExclusaoEtapa(0)}>
                        Voltar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => void solicitarExclusao()}
                        loading={privacidadeSalvando}
                        disabled={!exclusaoSenha || exclusaoConfirmacao !== 'EXCLUIR MINHA CONTA'}
                      >
                        Confirmar exclusão
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {auditDetalhe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setAuditDetalhe(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#FAFAFA]">Detalhe do evento</h3>
              <button
                onClick={() => setAuditDetalhe(null)}
                className="text-[#A1A1AA] hover:text-[#FAFAFA]"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-[13px]" style={{ color: '#A1A1AA' }}>
              {auditDetalhe.recurso} · {auditDetalhe.acao} ·{' '}
              {formatarDataHora(auditDetalhe.criadoEm)}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase" style={{ color: '#71717A' }}>
                  Dados antigos
                </p>
                <pre
                  className="max-h-40 overflow-x-auto rounded-lg p-3 font-mono text-[11px]"
                  style={{ backgroundColor: '#060608', color: '#A1A1AA' }}
                >
                  {JSON.stringify(auditDetalhe.dadosAntigos ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase" style={{ color: '#71717A' }}>
                  Dados novos
                </p>
                <pre
                  className="max-h-40 overflow-x-auto rounded-lg p-3 font-mono text-[11px]"
                  style={{ backgroundColor: '#060608', color: '#A1A1AA' }}
                >
                  {JSON.stringify(auditDetalhe.dadosNovos ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
