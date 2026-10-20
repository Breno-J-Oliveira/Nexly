import { AuthShell } from '@/components/marketing/AuthShell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
