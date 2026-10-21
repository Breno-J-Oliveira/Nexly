'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';

const tabs = [
  { id: 'overview', label: 'Visão geral', icon: 'chart-column' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar-days' },
  { id: 'stock', label: 'Estoque', icon: 'box' },
] as const;
type PreviewTab = (typeof tabs)[number]['id'];
const appointments = [
  { time: '09:00', name: 'Marina Souza', service: 'Corte e finalização', initials: 'MS' },
  { time: '10:30', name: 'Rafael Lima', service: 'Atendimento agendado', initials: 'RL' },
  { time: '14:00', name: 'Camila Alves', service: 'Retorno', initials: 'CA' },
];

export function ProductPreview({ initialTab = 'overview' }: { initialTab?: PreviewTab }) {
  const [active, setActive] = useState<PreviewTab>(initialTab);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = tabs[next];
    if (!nextTab) return;
    setActive(nextTab.id);
    buttons.current[next]?.focus();
  }
  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#111116] shadow-2xl shadow-indigo-500/5">
      <div className="flex">
        <div className="min-w-0 flex-1">
          <div
            role="tablist"
            aria-label="Explorar prévia do Nexly"
            className="flex gap-1 border-b border-white/10 bg-[#111116] p-2"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                ref={(element) => {
                  buttons.current[index] = element;
                }}
                type="button"
                id={`${id}-${tab.id}-tab`}
                role="tab"
                aria-selected={active === tab.id}
                aria-controls={`${id}-${tab.id}-panel`}
                tabIndex={active === tab.id ? 0 : -1}
                onClick={() => setActive(tab.id)}
                onKeyDown={(event) => navigate(event, index)}
                className={`min-h-10 min-w-0 flex-1 rounded-md px-2 text-xs font-medium transition-colors ${active === tab.id ? 'bg-[#18181F] text-[#A5B4FC]' : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              id={`${id}-${tab.id}-panel`}
              role="tabpanel"
              aria-labelledby={`${id}-${tab.id}-tab`}
              hidden={active !== tab.id}
              tabIndex={0}
              className="min-h-[265px]"
            >
              {tab.id === 'overview' ? (
                <Image
                  src="/images/product/dashboard.webp"
                  alt="Prévia do painel Nexly com indicadores, agenda e alertas de estoque — dados de exemplo"
                  width={1200}
                  height={750}
                  priority
                  sizes="(max-width: 768px) 100vw, 896px"
                  className="h-auto w-full"
                />
              ) : tab.id === 'agenda' ? (
                <div className="p-5 sm:p-6">
                  <p className="mb-4 text-xs text-[#B4B0C3]">Próximos atendimentos · exemplo</p>
                  <ul className="space-y-3">
                    {appointments.map((appointment) => (
                      <li
                        key={appointment.time}
                        className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#17171F] p-3"
                      >
                        <span className="w-10 shrink-0 text-xs text-[#818CF8]">
                          {appointment.time}
                        </span>
                        <span
                          aria-hidden="true"
                          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#353046] text-[10px] text-[#D7D0EC] sm:flex"
                        >
                          {appointment.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white">{appointment.name}</p>
                          <p className="mt-1 text-[11px] text-[#A9A4B9]">{appointment.service}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-5 sm:p-6">
                  <p className="mb-4 text-xs text-[#B4B0C3]">Produtos e insumos · exemplo</p>
                  <ul className="space-y-3">
                    {[
                      {
                        name: 'Shampoo profissional',
                        quantity: '12 un.',
                        status: 'Em dia',
                        color: 'text-[#97D8BC]',
                      },
                      {
                        name: 'Máscara hidratante',
                        quantity: '8 un.',
                        status: 'Em dia',
                        color: 'text-[#97D8BC]',
                      },
                      {
                        name: 'Óleo finalizador',
                        quantity: '2 un.',
                        status: 'Repor',
                        color: 'text-[#F0CC8D]',
                      },
                    ].map((product) => (
                      <li
                        key={product.name}
                        className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-[#17171F] p-3"
                      >
                        <div>
                          <p className="text-xs font-medium text-white">{product.name}</p>
                          <p className="mt-1 text-[11px] text-[#A9A4B9]">{product.quantity}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] ${product.color}`}>
                          {product.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="border-t border-white/8 px-4 py-3 text-center text-[11px] leading-5 text-[#AAA6BA]">
        Prévia interativa · dados de exemplo
      </figcaption>
    </figure>
  );
}
