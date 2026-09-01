import { PageTransition } from '@/components/PageTransition';
import { Shell } from '@/components/Shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Shell><PageTransition>{children}</PageTransition></Shell>;
}
