import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/Toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexly — Gestão para pequenos negócios',
  description: 'Agenda de serviços + estoque/PDV em uma única plataforma.',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
