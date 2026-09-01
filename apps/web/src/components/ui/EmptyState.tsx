'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

function SvgIcon({ d }: { d: string }) {
  return (
    <svg
      width={40} height={40} viewBox="0 0 24 24" fill="none"
      stroke="#3F3F46" strokeWidth={1.2} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">
        <SvgIcon d={icon} />
      </div>
      <h3 className="text-[15px] font-semibold" style={{ color: '#A1A1AA' }}>
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed" style={{ color: '#71717A' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
