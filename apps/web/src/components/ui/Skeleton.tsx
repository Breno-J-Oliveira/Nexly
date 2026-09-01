'use client';

type Variant = 'line' | 'card' | 'avatar' | 'table-row' | 'kpi';

interface SkeletonProps {
  variant?: Variant;
  className?: string;
  count?: number;
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`h-4 rounded skeleton-shimmer ${className}`} />;
}

export function Skeleton({ variant = 'line', className = '', count = 1 }: SkeletonProps) {
  if (variant === 'line') {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <SkeletonLine key={i} className={className} />
        ))}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`rounded-lg p-6 ${className}`}
            style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="h-5 w-2/3 rounded skeleton-shimmer" />
            <div className="mt-3 h-8 w-1/3 rounded skeleton-shimmer" />
          </div>
        ))}
      </>
    );
  }

  if (variant === 'kpi') {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`rounded-lg p-5 ${className}`}
            style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="h-3.5 w-24 rounded skeleton-shimmer" />
            <div className="mt-3 h-9 w-28 rounded skeleton-shimmer" />
            <div className="mt-2 h-3 w-20 rounded skeleton-shimmer" />
          </div>
        ))}
      </>
    );
  }

  if (variant === 'avatar') {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`rounded-full skeleton-shimmer ${className}`}
            style={{ width: 32, height: 32 }} />
        ))}
      </>
    );
  }

  if (variant === 'table-row') {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b py-3"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="h-8 w-8 rounded-full skeleton-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded skeleton-shimmer" />
              <div className="h-3 w-1/2 rounded skeleton-shimmer" />
            </div>
            <div className="h-4 w-16 rounded skeleton-shimmer" />
          </div>
        ))}
      </>
    );
  }

  return null;
}
