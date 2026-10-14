'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Keeps route-owned controls in the shared header without duplicating page titles. */
export function PageToolbar({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setTarget(document.getElementById('page-toolbar')); }, []);
  const content = <div className="page-toolbar">{children}</div>;
  return target ? createPortal(content, target) : content;
}
