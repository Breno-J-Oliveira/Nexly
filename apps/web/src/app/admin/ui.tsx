'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRotateRight,
  faCircleExclamation,
  faInbox,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import styles from './console.module.css';

export function LoadingPanel({ label }: { label: string }) {
  return (
    <div className={styles.state} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      {label}
    </div>
  );
}

export function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className={styles.state}>
      <FontAwesomeIcon icon={faInbox} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function ErrorPanel({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className={styles.state} role="alert">
      <FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />
      <p>{message}</p>
      {retry && (
        <button className={styles.secondaryButton} type="button" onClick={retry}>
          <FontAwesomeIcon icon={faArrowRotateRight} /> Tentar novamente
        </button>
      )}
    </div>
  );
}

export function ActionDialog({
  title,
  onClose,
  busy,
  children,
}: {
  title: string;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className={styles.dialogHeader}>
        <h2 id={heading}>{title}</h2>
        <button
          className={styles.iconButton}
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Fechar"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
