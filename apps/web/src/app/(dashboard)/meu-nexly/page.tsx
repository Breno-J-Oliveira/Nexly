'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MODULES, ModuleId, canAccessWorkspaceRoute } from '@nexly/shared';
import { useAuth } from '@/lib/auth';
import { useWorkspace } from '@/lib/workspace';
import { api } from '@/lib/api';
import { ModulePicker } from '@/components/ModulePicker';
import { RecommendationForm } from '@/components/RecommendationForm';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { Button } from '@/components/ui/Button';

export default function MeuNexly() {
  const { user } = useAuth();
  const { profile, reload } = useWorkspace();
  const [preset, setPreset] = useState(profile.preset || 'personalizado');
  const [modulos, setModulos] = useState<ModuleId[]>(profile.modulos);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    setPreset(profile.preset || 'personalizado');
    setModulos(profile.modulos);
  }, [profile.preset, profile.modulos]);
  async function save() {
    setBusy(true);
    setMessage('');
    try {
      await api.put('/experiencia/workspace', { preset, modulos });
      await reload();
      setMessage(
        'Seu Nexly foi atualizado. Os dados dos módulos desativados continuam preservados.',
      );
    } catch {
      setMessage('Não foi possível salvar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-8">
      <PageToolbar>
        <div>
          <h2 className="font-semibold">Meu Nexly</h2>
          <p className="mt-1">Recursos, guia de uso e sua experiência</p>
        </div>
      </PageToolbar>
      <section className="max-w-4xl rounded-xl border border-white/10 bg-[#111116] p-5">
        <h2 className="mb-2 text-lg font-semibold">Uma experiência do seu jeito</h2>
        <p className="mb-6 text-sm text-[#A1A1AA]">
          O modelo sugere recursos para sua rotina. O administrador pode ativar ou desativar funções
          a qualquer momento.
        </p>
        <ModulePicker
          preset={preset}
          modulos={modulos}
          disabled={user?.role !== 'ADMIN'}
          onChange={(p, ids) => {
            setPreset(p);
            setModulos(ids);
            setMessage('');
          }}
        />
        {user?.role === 'ADMIN' && (
          <Button
            className="mt-5"
            disabled={!modulos.length}
            loading={busy}
            onClick={() => void save()}
          >
            Salvar meus recursos
          </Button>
        )}
        {message && (
          <p role="status" className="mt-3 text-sm text-[#A1A1AA]">
            {message}
          </p>
        )}
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">Entenda seu painel</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.filter(
            (m) =>
              profile.modulos.includes(m.id) && canAccessWorkspaceRoute(m.href, user?.role || ''),
          ).map((m) => (
            <div key={m.id} className="rounded-xl border border-white/10 bg-[#111116] p-5">
              <h3 className="font-semibold">{m.nome}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">{m.descricao}</p>
              <Link href={m.href} className="mt-4 inline-block text-sm text-[#818CF8]">
                Conhecer {m.nome}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#71717A]">
          Seu papel na equipe determina as ações disponíveis em cada módulo.
        </p>
      </section>
      <section className="max-w-2xl rounded-xl border border-white/10 bg-[#111116] p-5">
        <h2 className="mb-4 text-lg font-semibold">Sua experiência importa</h2>
        {profile.depoimento && (
          <p className="mb-4 text-xs text-[#A1A1AA]">
            Situação:{' '}
            {profile.depoimento.status === 'APROVADO' && profile.depoimento.autorizaPublicacao
              ? 'Publicação autorizada e aprovada'
              : 'Registrada; publicação depende de autorização e revisão'}
          </p>
        )}
        {profile.podeRecomendar ? (
          <RecommendationForm key={profile.depoimento ? 'existente' : 'novo'} />
        ) : (
          <p className="text-sm leading-relaxed text-[#A1A1AA]">
            Você poderá compartilhar sua experiência após 7 dias de conta e uso em pelo menos 3 dias
            diferentes. Dias de uso registrados: {Math.min(profile.diasDeUso, 3)}/3.
          </p>
        )}
        {profile.depoimento && (
          <Button
            variant="ghost"
            className="mt-4 text-red-400"
            onClick={() => {
              void api
                .delete('/experiencia/recomendacao')
                .then(() => reload())
                .catch(() => setMessage('Não foi possível retirar sua recomendação.'));
            }}
          >
            Retirar recomendação e autorização de publicação
          </Button>
        )}
      </section>
    </div>
  );
}
