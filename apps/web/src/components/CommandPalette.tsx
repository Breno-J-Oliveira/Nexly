'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';

type Destination = { href: string; label: string };
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

export function CommandPalette({
  open,
  setOpen,
  items,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  items: Destination[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = items.filter((item) =>
    normalize(`${item.label} ${item.href}`).includes(normalize(query)),
  );
  const selected = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        // Não sobrepor um formulário em edição com outro diálogo.
        if (document.querySelector('[role="dialog"]')) return;
        event.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [setOpen]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (open)
      document.getElementById(`${listId}-${selected}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, selected, listId]);

  const navigate = (item: Destination) => {
    setOpen(false);
    router.push(item.href);
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Ir para uma página"
      width="max-w-xl"
      initialFocusRef={input}
    >
      <label htmlFor={`${listId}-query`} className="sr-only">
        Buscar página
      </label>
      <input
        ref={input}
        id={`${listId}-query`}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={results.length ? `${listId}-${selected}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setActive(
              results.length
                ? (selected + (event.key === 'ArrowDown' ? 1 : -1) + results.length) %
                    results.length
                : 0,
            );
          }
          if (event.key === 'Enter' && results[selected]) {
            event.preventDefault();
            navigate(results[selected]);
          }
        }}
        placeholder="Busque por agenda, comissões, estoque…"
        className="w-full rounded-xl border border-white/15 bg-[#111116] px-4 py-3 text-sm text-[#FAFAFA] outline-none focus:border-[#818CF8] focus:ring-2 focus:ring-[#6366F1]/25"
      />
      <p role="status" className="my-3 text-xs text-[#A1A1AA]">
        {results.length} páginas disponíveis para seu acesso
      </p>
      <div
        id={listId}
        role="listbox"
        aria-label="Páginas disponíveis"
        className="max-h-[45dvh] space-y-1 overflow-y-auto"
      >
        {results.map((item, index) => (
          <button
            key={item.href}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={selected === index}
            type="button"
            tabIndex={-1}
            onClick={() => navigate(item)}
            className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${selected === index ? 'bg-[#6366F1]/20 text-[#C7D2FE]' : 'text-[#E4E4E7] hover:bg-white/5'}`}
          >
            {item.label}
            <span aria-hidden="true">↵</span>
          </button>
        ))}
      </div>
      {!results.length && (
        <p className="py-6 text-center text-sm text-[#A1A1AA]">
          Nenhuma página encontrada. Tente outro nome.
        </p>
      )}
      <p className="mt-4 border-t border-white/10 pt-3 text-xs text-[#A1A1AA]">
        ↑ ↓ para escolher · Enter para abrir · Esc para fechar
      </p>
    </Modal>
  );
}
