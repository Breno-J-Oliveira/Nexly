'use client';

import { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
}

export function DataTable<T extends Record<string, any>>(props: {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
}) {
  if (props.loading) {
    return (
      <div style={{ borderRadius: 12, background: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 16, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="skeleton-shimmer" style={{ height: 14, borderRadius: 4, flex: 1 }} />
            <div className="skeleton-shimmer" style={{ height: 14, borderRadius: 4, flex: 2 }} />
            <div className="skeleton-shimmer" style={{ height: 14, borderRadius: 4, flex: 1 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!props.data.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', borderRadius: 12, background: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#71717A', fontSize: 13 }}>Nenhum registro</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, background: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
      <table style={{ width: '100%', fontSize: 13, textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {props.columns.map((c) => (
              <th key={c.key} style={{ padding: '12px 16px', color: '#71717A', fontWeight: 500 }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.data.map((row, i) => (
            <tr key={String(row[props.keyField])} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {props.columns.map((c) => (
                <td key={c.key} style={{ padding: '10px 16px', color: '#FAFAFA' }}>
                  {c.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
