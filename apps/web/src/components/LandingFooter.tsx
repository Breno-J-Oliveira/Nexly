import Link from 'next/link';
import Image from 'next/image';

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
      { href: '/suporte', label: 'Ajuda e suporte' },
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
    <footer
      className="border-t"
      style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Link
              href="/"
              aria-label="Nexly — página inicial"
              className="inline-flex items-center gap-2 rounded-lg"
            >
              <div className="flex h-10 w-8 items-center justify-center">
                <Image
                  src="/logo.svg"
                  alt="Nexly"
                  width={28}
                  height={36}
                  className="h-9 w-7 object-contain"
                />
              </div>
              <span className="text-lg font-bold" style={{ color: '#FAFAFA' }}>
                Nexly
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed" style={{ color: '#A1A1AA' }}>
              Gestão inteligente para pequenos negócios. Agenda, estoque e PDV integrados em um só
              lugar.
            </p>
          </div>

          {colunas.map((c) => (
            <div key={c.titulo}>
              <h2 className="text-[13px] font-semibold" style={{ color: '#FAFAFA' }}>
                {c.titulo}
              </h2>
              <ul className="mt-4 space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="inline-block rounded py-1 text-[13px] transition-colors hover:underline"
                      style={{ color: '#A1A1AA' }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 md:flex-row"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <p className="text-[12px]" style={{ color: '#A1A1AA' }}>
            © {new Date().getFullYear()} Nexly. Todos os direitos reservados.
          </p>
          <p className="text-[12px]" style={{ color: '#A1A1AA' }}>
            Feito no Brasil 🇧🇷
          </p>
        </div>
      </div>
    </footer>
  );
}
