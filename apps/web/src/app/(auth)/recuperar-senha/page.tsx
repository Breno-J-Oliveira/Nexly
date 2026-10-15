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
      <div
        role="status"
        className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm leading-6 text-[#D4D4D8]"
      >
        <p className="font-medium text-amber-200">Recuperação por e-mail indisponível</p>
        <p className="mt-2">
          O envio de instruções por e-mail ainda não está disponível. Você pode voltar ao login para
          tentar entrar novamente.
        </p>
      </div>
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
