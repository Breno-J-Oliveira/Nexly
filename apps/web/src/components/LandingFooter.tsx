import Link from 'next/link';

const colunas = [
  {
    titulo: 'Produto',
    links: [
      { href: '/funcionalidades', label: 'Funcionalidades' },
      { href: '/precos', label: 'Preços' },
      { href: '/blog', label: 'Blog' },
      { href: '/cadastro', label: 'Criar conta' },
    ],
  },
  {
    titulo: 'Recursos',
    links: [
      { href: '/login', label: 'Entrar' },
      { href: '/cadastro', label: 'Começar grátis' },
      { href: '/funcionalidades', label: 'Baixa automática' },
      { href: '/precos', label: 'Comparar planos' },
    ],
  },
  {
    titulo: 'Legal',
    links: [
      { href: '/termos', label: 'Termos de uso' },
      { href: '/privacidade', label: 'Privacidade' },
      { href: '/privacidade', label: 'LGPD' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t" style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#6366F1' }}>
                <img src="/logo.svg" alt="Nexly" className="h-4 w-4 object-contain" />
              </div>
              <span className="text-lg font-bold" style={{ color: '#FAFAFA' }}>Nexly</span>
            </div>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed" style={{ color: '#71717A' }}>
              Gestão inteligente para pequenos negócios. Agenda, estoque e PDV integrados em um só lugar.
            </p>
          </div>

          {colunas.map((c) => (
            <div key={c.titulo}>
              <h4 className="text-[13px] font-semibold" style={{ color: '#FAFAFA' }}>{c.titulo}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] transition-colors hover:text-[#FAFAFA]" style={{ color: '#A1A1AA' }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 md:flex-row" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[12px]" style={{ color: '#71717A' }}>© {new Date().getFullYear()} Nexly. Todos os direitos reservados.</p>
          <p className="text-[12px]" style={{ color: '#71717A' }}>Feito no Brasil 🇧🇷</p>
        </div>
      </div>
    </footer>
  );
}
