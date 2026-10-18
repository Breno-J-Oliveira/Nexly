'use client';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { MODULE_IDS, ModuleId, routeModule, canAccessWorkspaceRoute } from '@nexly/shared';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from './api';
import { useAuth } from './auth';
import { ErrorState } from '@/components/ui/ErrorState';

export interface Recommendation {
  nota: number;
  texto: string;
  nomePublico: string;
  ocupacao: string;
  autorizaPublicacao: boolean;
  status: string;
}
export interface Workspace {
  preferencias?:{nomeCliente?:string;nomeServico?:string;segmento?:string};
  preset: string | null;
  modulos: ModuleId[];
  diasDeUso: number;
  podeRecomendar: boolean;
  pedirRecomendacao: boolean;
  depoimento: Recommendation | null;
}
const Context = createContext<{
  profile: Workspace;
  reload: () => Promise<void>;
  enabled: (path: string) => boolean;
}>({
  profile: {
    preset: null,
    modulos: MODULE_IDS,
    diasDeUso: 0,
    podeRecomendar: false,
    pedirRecomendacao: false,
    depoimento: null,
  },
  reload: async () => {},
  enabled: () => true,
});
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Workspace | null>(null);
  const [erro, setErro] = useState(false);
  const reload = useCallback(async () => {
    const r = await api.get<Workspace>('/experiencia');
    setProfile(r.data);
  }, []);
  useEffect(() => {
    let active = true;
    api
      .post<Workspace>('/experiencia/atividade')
      .then((r) => {
        if (active) setProfile(r.data);
      })
      .catch(() => {
        if (active) setErro(true);
      });
    return () => {
      active = false;
    };
  }, []);
  if (erro && !profile)
    return (
      <ErrorState
        message="Não foi possível carregar seu Nexly"
        onRetry={() => {
          void reload()
            .then(() => setErro(false))
            .catch(() => setErro(true));
        }}
      />
    );
  if (!profile)
    return (
      <div role="status" className="p-8 text-sm text-[#A1A1AA]">
        Preparando seu Nexly…
      </div>
    );
  return (
    <Context.Provider
      value={{
        profile,
        reload,
        enabled: (path) => {
          const id = routeModule(path);
          return !id || profile.modulos.includes(id);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useWorkspace = () => useContext(Context);
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { enabled } = useWorkspace();
  const { user } = useAuth();
  if (!canAccessWorkspaceRoute(path, user?.role ?? ''))
    return (
      <section className="rounded-2xl border border-white/10 bg-[#111116] p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Seu perfil não tem acesso a esta área</h2>
        <p className="mt-3 max-w-xl text-sm text-[#A1A1AA]">
          Peça ao administrador do seu negócio para revisar sua função se precisar trabalhar com
          este recurso.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-block rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium text-white"
        >
          Voltar ao painel
        </Link>
      </section>
    );
  return enabled(path) ? (
    children
  ) : (
    <div className="rounded-xl border border-white/10 bg-[#111116] p-8">
      <h2 className="text-xl font-semibold">Esta função está desativada no seu Nexly</h2>
      <p className="mt-3 text-sm text-[#A1A1AA]">
        Você pode consultar e ajustar os recursos do seu negócio em Meu Nexly.
      </p>
      <Link href="/meu-nexly" className="mt-5 inline-block text-sm text-[#818CF8]">
        Conhecer meus recursos
      </Link>
    </div>
  );
}
