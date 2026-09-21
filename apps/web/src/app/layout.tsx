import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/Toaster';
import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nexly.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: '%s — Nexly',
    default: 'Nexly — Gestão inteligente para pequenos negócios',
  },
  description:
    'Agenda, estoque e PDV em uma única plataforma. Para salões, clínicas, petshops e estúdios.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Nexly',
    title: 'Nexly — Gestão para pequenos negócios',
    description: 'Agenda, estoque e PDV em uma única plataforma.',
    url: BASE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@nexly',
  },
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Nexly',
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      description: 'Plano gratuito disponível',
    },
    description: 'Agenda, estoque e PDV em uma única plataforma para pequenos negócios.',
  };

  return (
    <html lang="pt-BR">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
