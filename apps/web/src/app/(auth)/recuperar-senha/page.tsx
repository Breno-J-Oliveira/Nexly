import { PasswordRecoveryForm } from '@/components/PasswordRecoveryForm';
import Link from 'next/link';
import { Brand } from '@/components/marketing/Brand';

export default function RecuperarSenhaPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111116] px-6 py-8 sm:p-10">
      <div className="flex justify-center">
        <Brand />
      </div>
      <h1 className="mt-6 text-center text-2xl font-semibold text-[#FAFAFA]">Recuperar senha</h1>
      <PasswordRecoveryForm />
      <p className="mt-5 text-sm leading-6 text-[#A1A1AA]">
        Se você ainda tem uma sessão aberta em outro dispositivo, altere sua senha na página Minha
        conta.
      </p>
      <Link
        href="/login"
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#6366F1] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4F46E5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#818CF8]"
      >
        Voltar ao login
      </Link>
    </div>
  );
}
