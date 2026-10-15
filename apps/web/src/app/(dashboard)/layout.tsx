import { AuthGuard } from '@/components/AuthGuard';
import { PageTransition } from '@/components/PageTransition';
import { Shell } from '@/components/Shell';
import { WorkspaceGate, WorkspaceProvider } from '@/lib/workspace';
import { RecommendationPrompt } from '@/components/RecommendationPrompt';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <WorkspaceProvider><Shell>
        <RecommendationPrompt />
        <WorkspaceGate><PageTransition>{children}</PageTransition></WorkspaceGate>
      </Shell></WorkspaceProvider>
    </AuthGuard>
  );
}
