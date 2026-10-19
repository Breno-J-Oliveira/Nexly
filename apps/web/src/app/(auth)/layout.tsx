import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:py-10" style={{ backgroundColor: '#060608' }}>
      {/* subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.22) 0%, transparent 55%)',
        }}
      />
      <div className="auth-content relative z-10 w-full max-w-[440px]">
        <Link href="/" className="mb-5 inline-flex rounded-lg px-2 py-2 text-sm text-[#A1A1AA] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">← Voltar para o início</Link>
        {children}
      </div>
    </div>
  );
}
