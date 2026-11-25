import type { Metadata } from 'next';
import { AuthGuard } from '@/components/AuthGuard';
import { PlatformConsole } from './PlatformConsole';

export const metadata: Metadata = {
  title: 'Administração da plataforma',
  robots: { index: false, follow: false },
};

export default function PlatformAdminPage() {
  return (
    <AuthGuard>
      <PlatformConsole />
    </AuthGuard>
  );
}
