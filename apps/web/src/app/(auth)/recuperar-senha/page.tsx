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
      <Link
        href="/login"
        className="mt-4 flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[#A5B4FC] hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#818CF8]"
      >
        Voltar ao login
      </Link>
    </div>
  );
}
