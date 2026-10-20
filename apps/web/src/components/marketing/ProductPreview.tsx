'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/Icon';

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
    <figure className="min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-[#101016] shadow-[0_32px_100px_-40px_#53509766]">
      <div className="flex items-center justify-between border-b border-white/8 bg-[#16161F] px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          {['#757080', '#656173', '#575365'].map((color) => (
            <span key={color} className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </span>
        <span className="text-[11px] text-[#ADACBE]">Seu espaço no Nexly</span>
        <Icon name="lock" color="#8F8C9F" size="xs" />
      </div>
      <div className="flex">
        <div
          className="hidden w-14 shrink-0 flex-col items-center gap-6 border-r border-white/8 py-5 sm:flex"
          aria-hidden="true"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C7C5FF] text-sm font-bold text-[#151326]">
            N
          </span>
          {tabs.map((tab) => (
            <Icon key={tab.id} name={tab.icon} color={active === tab.id ? '#C7C5FF' : '#777484'} />
          ))}
          <Icon name="users" color="#777484" />
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] text-[#AAA7BB]">Tudo pronto para o seu dia</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-white">
                Olá, seu negócio.
              </p>
            </div>
            <span className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-[#B4B1C3]">
              Hoje
            </span>
          </div>
          <div
            role="tablist"
            aria-label="Explorar prévia do Nexly"
            className="mt-5 flex gap-1 rounded-lg bg-[#09090D] p-1"
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
                className={`min-h-10 min-w-0 flex-1 rounded-md px-2 text-xs font-medium transition-colors ${active === tab.id ? 'bg-[#252332] text-[#D6D3FF]' : 'text-[#A7A3B6] hover:bg-white/5 hover:text-white'}`}
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
              className="min-h-[265px] pt-5"
            >
              {tab.id === 'overview' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Vendas registradas', value: 'R$ 420,00', icon: 'chart-column' },
                      { label: 'Atendimentos do dia', value: '08', icon: 'calendar-days' },
                    ].map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-xl border border-white/8 bg-[#17171F] p-3"
                      >
                        <p className="text-[11px] text-[#B0ADBF]">{metric.label}</p>
                        <p className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-white/8 p-4">
                    <p className="text-xs font-medium text-[#D3D0E0]">Movimento da semana</p>
                    <div
                      aria-hidden="true"
                      className="mt-4 flex h-24 items-end justify-between gap-3"
                    >
                      {[38, 60, 43, 78, 58, 90, 48].map((height, index) => (
                        <div
                          key={index}
                          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                        >
                          <div
                            className={`w-full max-w-8 rounded-t ${index === 5 ? 'bg-[#C7C5FF]' : 'bg-[#55516E]'}`}
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-[9px] text-[#9B97AD]">
                            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][index]}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="sr-only">
                      Gráfico ilustrativo de vendas da semana, com maior movimento no sábado.
                    </p>
                  </div>
                </>
              ) : tab.id === 'agenda' ? (
                <div>
                  <p className="mb-4 text-xs text-[#B4B0C3]">Próximos atendimentos · exemplo</p>
                  <ul className="space-y-3">
                    {appointments.map((appointment) => (
                      <li
                        key={appointment.time}
                        className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#17171F] p-3"
                      >
                        <span className="w-10 shrink-0 text-xs text-[#C7C5FF]">
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
                <div>
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
