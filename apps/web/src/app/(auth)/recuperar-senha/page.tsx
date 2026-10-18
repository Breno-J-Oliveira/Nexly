import { PasswordRecoveryForm } from '@/components/PasswordRecoveryForm';
import Link from 'next/link';
import Image from 'next/image';

export default function RecuperarSenhaPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111116] px-6 py-8 shadow-2xl sm:p-10">
      <Image
        src="/logo.svg"
        alt="Nexly"
        width={40}
        height={40}
        className="mx-auto h-10 w-10 object-contain"
      />
      <h1 className="mt-6 text-center text-2xl font-semibold text-[#FAFAFA]">Recuperar senha</h1>
      <PasswordRecoveryForm/>
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
