import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>{title}</h2>
        {description && (
          <p className="mt-1 text-sm" style={{ color: '#71717A' }}>{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
