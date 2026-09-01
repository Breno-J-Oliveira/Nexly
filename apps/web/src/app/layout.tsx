import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/Toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexly — Gestao para pequenos negocios',
  description: 'Agenda de servicos + estoque/PDV em uma unica plataforma.',
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
