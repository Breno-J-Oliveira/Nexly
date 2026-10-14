import { ReactNode } from 'react';

export function MetricGrid({ items }: { items: { label: string; value: ReactNode; note?: string }[] }) {
  return <div className="metric-grid">{items.map(item => <div key={item.label} className="metric-card">
    <p className="text-[13px] text-[#A1A1AA]">{item.label}</p>
    <p className="mt-3 text-2xl font-semibold tracking-tight text-[#FAFAFA]">{item.value}</p>
    {item.note && <p className="mt-2 text-[11px] text-[#818CF8]">{item.note}</p>}
  </div>)}</div>;
}
