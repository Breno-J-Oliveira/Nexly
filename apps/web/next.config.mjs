/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// CSP: 'unsafe-inline' é exigido pelo Next.js (scripts inline de hidratação).
// 'unsafe-eval' só entra em dev (HMR/turbopack).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${apiUrl} https://*.supabase.co https://vitals.vercel-insights.com https://*.posthog.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isProd ? 'upgrade-insecure-requests' : '',
]
  .filter(Boolean)
  .join('; ');

const nextConfig = {
  reactStrictMode: true,
  experimental: { cpus: 2 },
  transpilePackages: ['@nexly/shared'],
  poweredByHeader: false,
  serverExternalPackages: ['@zxing/browser'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
