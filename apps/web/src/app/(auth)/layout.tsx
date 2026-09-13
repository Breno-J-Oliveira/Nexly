export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: '#0C0C10' }}>
      {/* subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.22) 0%, transparent 55%)',
        }}
      />
      <div className="relative z-10 w-full max-w-[420px]">{children}</div>
    </div>
  );
}
