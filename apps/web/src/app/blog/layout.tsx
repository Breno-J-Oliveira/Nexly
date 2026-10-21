import { LandingHeader } from '@/components/LandingHeader';
import { LandingFooter } from '@/components/LandingFooter';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#060608]">
      <LandingHeader />
      <main id="blog-content" tabIndex={-1}>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
