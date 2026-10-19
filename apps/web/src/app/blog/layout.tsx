import { LandingHeader } from '@/components/LandingHeader';
import { LandingFooter } from '@/components/LandingFooter';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0C0C10]">
      <a
        href="#blog-content"
        className="sr-only z-[60] rounded-lg bg-indigo-500 p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <LandingHeader />
      <main id="blog-content" tabIndex={-1}>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
