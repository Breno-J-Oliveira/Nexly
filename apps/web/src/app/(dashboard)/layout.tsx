import { AuthGuard } from '@/components/AuthGuard';
import { PageTransition } from '@/components/PageTransition';
import { Shell } from '@/components/Shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Shell>
        <PageTransition>{children}</PageTransition>
      </Shell>
    </AuthGuard>
  );
}
