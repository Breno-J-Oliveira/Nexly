import Link from 'next/link';
import type { Metadata } from 'next';
import { PasswordResetForm } from '@/components/PasswordRecoveryForm';
export const metadata: Metadata = {
  title: 'Redefinir senha',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};
export default function RedefinirSenhaPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111116] p-6 sm:p-10">
      <h1 className="mb-6 text-2xl font-semibold">Redefinir senha</h1>
      <PasswordResetForm />
      <Link className="mt-6 block text-sm text-[#A5B4FC]" href="/login">
        Voltar ao login
      </Link>
    </div>
  );
}
