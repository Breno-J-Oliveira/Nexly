'use client';

import { ReactNode } from 'react';
import { Icon } from './Icon';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(99,102,241,0.10)' }}>
        <Icon name={icon} className="text-[#6366F1]" size="xl" />
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
