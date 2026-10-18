'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export function EditorModal({
  open,
  title,
  dirty,
  busy,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  dirty: boolean;
  busy: boolean;
  onClose: () => void;
  children: (requestClose: () => void) => ReactNode;
}) {
  const [discard, setDiscard] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) setDiscard(false);
  }, [open]);
  useEffect(() => {
    if (!open || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, dirty]);
  useEffect(() => {
    if (discard) keep.current?.focus();
    else if (open) previous.current?.focus();
  }, [discard, open]);
  const requestClose = () => {
    if (busy) return;
    if (discard) {
      setDiscard(false);
      return;
    }
    if (!dirty) {
      onClose();
      return;
    }
    previous.current = document.activeElement as HTMLElement;
    setDiscard(true);
  };
  return (
    <Modal
      open={open}
      title={discard ? 'Descartar alterações?' : title}
      width="max-w-2xl"
      onClose={requestClose}
    >
      {discard && (
        <div>
          <p className="text-sm leading-relaxed text-[#A1A1AA]">
            Suas alterações ainda não foram salvas. Você pode continuar editando ou descartá-las.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              ref={keep}
              type="button"
              onClick={() => setDiscard(false)}
              className="min-h-11 rounded-lg border border-white/15 px-4 text-sm text-[#FAFAFA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#818CF8]"
            >
              Continuar editando
            </button>
            <Button type="button" variant="danger" onClick={onClose}>
              Descartar alterações
            </Button>
          </div>
        </div>
      )}
      <div hidden={discard}>{children(requestClose)}</div>
    </Modal>
  );
}
