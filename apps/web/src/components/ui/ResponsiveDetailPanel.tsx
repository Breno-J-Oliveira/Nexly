'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Modal } from './Modal';

/** Desktop inspector becomes an explicit, keyboard-accessible dialog on small screens. */
export function ResponsiveDetailPanel({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return mobile ? (
    <Modal open={open} title={title} onClose={onClose}>
      {children}
    </Modal>
  ) : (
    <aside className="detail-panel hidden self-start md:block">{children}</aside>
  );
}
