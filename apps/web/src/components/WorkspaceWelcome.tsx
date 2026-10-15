'use client';
import Link from 'next/link';
import { MODULES, PRESETS, canAccessWorkspaceRoute } from '@nexly/shared';
import { useWorkspace } from '@/lib/workspace';
import { useAuth } from '@/lib/auth';
import { Icon } from './ui/Icon';
export function WorkspaceWelcome() {
  const { profile } = useWorkspace();
  const { user } = useAuth();
  const modelo = PRESETS.find((p) => p.id === profile.preset);
  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-[#111116] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Seu Nexly{modelo ? ` · ${modelo.nome}` : ''}</h2>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Escolha uma função para começar. Em Meu Nexly você encontra o guia e pode ajustar os
            recursos.
          </p>
        </div>
        <Link href="/meu-nexly" className="text-xs text-[#818CF8]">
          Personalizar e conhecer recursos
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {MODULES.filter(
          (m) =>
            profile.modulos.includes(m.id) && canAccessWorkspaceRoute(m.href, user?.role || ''),
        ).map((m) => (
          <Link
            key={m.id}
            href={m.href}
            title={m.descricao}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#18181F] px-3 py-2 text-xs text-[#A1A1AA] hover:border-[#6366F1]/40 hover:text-white"
          >
            <Icon name={m.icon} size="sm" color="#818CF8" />
            {m.nome}
          </Link>
        ))}
      </div>
    </section>
  );
}
