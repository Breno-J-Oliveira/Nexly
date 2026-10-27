'use client';

import { useEffect } from 'react';

/** Protege recarregamentos e links. Não interfere no histórico do roteador. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const beforeLink = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.hasAttribute('download') ||
        (link.target && link.target !== '_self')
      )
        return;
      const destination = new URL(link.href);
      if (!['http:', 'https:'].includes(destination.protocol)) return;
      // Saídas externas já passam pelo aviso nativo de beforeunload.
      if (destination.origin !== location.origin) return;
      if (destination.pathname === location.pathname && destination.search === location.search)
        return;
      if (!window.confirm('Você tem alterações não salvas. Sair desta página e descartá-las?')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', beforeLink, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', beforeLink, true);
    };
  }, [dirty]);
}
