import type { MDXComponents } from 'mdx/types';

/**
 * Componentes de estilo para o conteúdo MDX do blog.
 * Tokens do design system: text-primary #FAFAFA, text-secondary #A1A1AA,
 * brand-500 #6366F1, bg-elevated #18181F, border-subtle rgba(255,255,255,0.06).
 */
export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1 className="mb-4 mt-8 text-2xl font-semibold" style={{ color: '#FAFAFA' }} {...props} />
  ),
  h2: (props) => (
    <h2 className="mb-3 mt-8 text-xl font-semibold" style={{ color: '#FAFAFA' }} {...props} />
  ),
  h3: (props) => (
    <h3 className="mb-2 mt-6 text-lg font-semibold" style={{ color: '#FAFAFA' }} {...props} />
  ),
  p: (props) => (
    <p
      className="my-4 max-w-[65ch] text-[15px]"
      style={{ color: '#A1A1AA', lineHeight: 1.8 }}
      {...props}
    />
  ),
  a: (props) => (
    <a
      className="underline"
      style={{ color: '#818CF8' }}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: (props) => (
    <ul className="my-4 list-disc space-y-2 pl-6" style={{ color: '#A1A1AA' }} {...props} />
  ),
  ol: (props) => (
    <ol className="my-4 list-decimal space-y-2 pl-6" style={{ color: '#A1A1AA' }} {...props} />
  ),
  li: (props) => <li className="text-[15px]" style={{ lineHeight: 1.7 }} {...props} />,
  strong: (props) => <strong style={{ color: '#FAFAFA' }} {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-4 border-l-4 pl-4 italic"
      style={{ borderColor: '#6366F1', color: '#71717A' }}
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="rounded px-1.5 py-0.5 font-mono text-[13px]"
      style={{ backgroundColor: '#18181F', color: '#A5B4FC' }}
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg border p-4 font-mono text-[13px]"
      style={{ backgroundColor: '#18181F', borderColor: 'rgba(255,255,255,0.06)', color: '#A1A1AA' }}
      {...props}
    />
  ),
};
