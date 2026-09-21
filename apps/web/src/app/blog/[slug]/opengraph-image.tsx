import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/lib/blog';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: '#0C0C10',
          color: '#FAFAFA',
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              backgroundColor: 'rgba(99,102,241,0.12)',
              color: '#818CF8',
              fontSize: 20,
            }}
          >
            {post?.categoria ?? 'Blog'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 800,
                color: '#fff',
              }}
            >
              Nx
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>Nexly</div>
          </div>
        </div>

        <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.2, maxWidth: '90%' }}>
          {post?.title ?? 'Blog Nexly'}
        </div>

        <div style={{ color: '#71717A', fontSize: 20 }}>Blog Nexly</div>
      </div>
    ),
    { ...size },
  );
}
