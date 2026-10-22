'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

type Slide = { id: string; label: string; content: ReactNode };

/** Sem rotação automática: leitura e foco permanecem sob controle do visitante. */
export function ContentCarousel({
  label,
  slides,
  navigation = 'labels',
  syncHash = false,
}: {
  label: string;
  slides: Slide[];
  navigation?: 'labels' | 'numbers';
  syncHash?: boolean;
}) {
  const id = useId();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!syncHash) return;
    const selectHash = () => {
      const index = slides.findIndex((slide) => `#${slide.id}` === window.location.hash);
      if (index >= 0) setActive(index);
    };
    selectHash();
    window.addEventListener('hashchange', selectHash);
    return () => window.removeEventListener('hashchange', selectHash);
  }, [slides, syncHash]);
  if (!slides.length) return null;
  const select = (index: number, focus = false) => {
    const next = (index + slides.length) % slides.length;
    setActive(next);
    if (syncHash) window.history.replaceState(window.history.state, '', `#${slides[next]!.id}`);
    if (focus) tabs.current[next]?.focus({ preventScroll: true });
    tabs.current[next]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'instant',
    });
  };
  return (
    <section aria-label={label} aria-roledescription="carrossel" className="min-w-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label={`Escolher: ${label}`}
          className="flex max-w-full flex-1 gap-2 overflow-x-auto pb-2"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              id={`${id}-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-controls={`${id}-panel-${index}`}
              aria-label={slide.label}
              tabIndex={active === index ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={(event) => {
                const next =
                  event.key === 'ArrowRight'
                    ? index + 1
                    : event.key === 'ArrowLeft'
                      ? index - 1
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? slides.length - 1
                          : null;
                if (next !== null) {
                  event.preventDefault();
                  select(next, true);
                }
              }}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm transition-colors ${active === index ? 'border-[#6366F1]/50 bg-[#6366F1]/10 text-[#C7D2FE]' : 'border-white/10 text-[#A1A1AA] hover:border-white/30 hover:text-white'}`}
            >
              {navigation === 'labels' ? slide.label : String(index + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pb-2">
          <button
            type="button"
            aria-label={`Anterior: ${label}`}
            disabled={slides.length === 1}
            onClick={() => select(active - 1)}
            className="h-11 w-11 rounded-full border border-white/15 text-lg hover:bg-white/5 disabled:opacity-40"
          >
            ←
          </button>
          <button
            type="button"
            aria-label={`Próximo: ${label}`}
            disabled={slides.length === 1}
            onClick={() => select(active + 1)}
            className="h-11 w-11 rounded-full border border-white/15 text-lg hover:bg-white/5 disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          id={`${id}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          hidden={active !== index}
          tabIndex={0}
          className="rounded-2xl"
        >
          {slide.content}
        </div>
      ))}
      <p
        className="mt-4 text-xs text-[#A1A1AA]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {String(active + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')} ·{' '}
        {slides[active]?.label}
      </p>
    </section>
  );
}
