import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Nexly — Gestão inteligente para pequenos negócios';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'linear-gradient(135deg, #0C0C10 0%, #171721 60%, #1a1530 100%)',
          color: '#FAFAFA',
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            Nx
          </div>
          <div style={{ fontSize: 48, fontWeight: 700 }}>Nexly</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 28, color: '#A1A1AA' }}>
          Gestão inteligente para pequenos negócios
        </div>
        <div style={{ marginTop: 60, display: 'flex', gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 220,
                height: 120,
                borderRadius: 16,
                backgroundColor: '#111116',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
