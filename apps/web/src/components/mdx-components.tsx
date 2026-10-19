import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * Componentes de estilo para o conteúdo MDX do blog.
 * Tokens do design system: text-primary #FAFAFA, text-secondary #A1A1AA,
 * brand-500 #6366F1, bg-elevated #18181F, border-subtle rgba(255,255,255,0.06).
 */
export const mdxComponents: MDXComponents = {
  h1: ({ children, ...props }) => (
    <h1 className="mb-4 mt-8 text-2xl font-semibold" style={{ color: '#FAFAFA' }} {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mb-4 mt-10 text-2xl font-semibold tracking-tight"
      style={{ color: '#FAFAFA' }}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mb-2 mt-6 text-lg font-semibold" style={{ color: '#FAFAFA' }} {...props}>
      {children}
    </h3>
  ),
  p: (props) => (
    <p
      className="my-5 max-w-[68ch] text-base"
      style={{ color: '#C4C4CC', lineHeight: 1.9 }}
      {...props}
    />
  ),
  a: ({ children, href = '', ...props }: ComponentProps<'a'>) =>
    href.startsWith('/') && !href.startsWith('//') ? (
      <Link
        href={href}
        className="rounded text-indigo-300 underline underline-offset-4 hover:text-indigo-200"
        {...props}
      >
        {children}
      </Link>
    ) : (
      <a
        href={href}
        className="rounded underline underline-offset-4 hover:text-indigo-200"
        style={{ color: '#818CF8' }}
        target={href.startsWith('#') ? undefined : '_blank'}
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
  ul: (props) => (
    <ul className="my-4 list-disc space-y-2 pl-6" style={{ color: '#A1A1AA' }} {...props} />
  ),
  ol: (props) => (
    <ol className="my-4 list-decimal space-y-2 pl-6" style={{ color: '#A1A1AA' }} {...props} />
  ),
  li: (props) => <li className="text-base" style={{ lineHeight: 1.9 }} {...props} />,
  strong: (props) => <strong style={{ color: '#FAFAFA' }} {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-4 border-l-4 pl-4 italic"
      style={{ borderColor: '#6366F1', color: '#A1A1AA' }}
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
      style={{
        backgroundColor: '#18181F',
        borderColor: 'rgba(255,255,255,0.06)',
        color: '#A1A1AA',
      }}
      {...props}
    />
  ),
};
