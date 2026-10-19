import { Icon } from '@/components/ui/Icon';

export function BlogArtwork({ category, large = false }: { category: string; large?: boolean }) {
  const finance = category === 'Finanças';
  const privacy = category === 'Privacidade' || category === 'Jurídico';
  const color = finance ? 'text-emerald-300' : privacy ? 'text-sky-300' : 'text-indigo-300';
  return (
    <div
      aria-hidden="true"
      className={`relative flex overflow-hidden items-center justify-center ${large ? 'min-h-64 p-8 sm:min-h-80' : 'h-40 p-6'} ${finance ? 'bg-gradient-to-br from-emerald-500/15 via-[#12171B] to-[#111116]' : privacy ? 'bg-gradient-to-br from-sky-500/15 via-[#121521] to-[#111116]' : 'bg-gradient-to-br from-indigo-500/20 via-[#18162B] to-[#111116]'}`}
    >
      <div className="absolute -right-10 -top-14 h-52 w-52 rounded-full border border-white/[0.06]" />
      <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border border-white/[0.04]" />
      <div
        className={`relative w-full max-w-64 -rotate-3 rounded-2xl border border-white/10 bg-[#111116]/90 shadow-2xl ${large ? 'p-6' : 'p-4'}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${color}`}
          >
            <Icon name={finance ? 'chart-line' : privacy ? 'lock' : 'calendar-days'} size="lg" />
          </span>
          <div className="flex-1 space-y-2">
            <div className="h-2 w-3/4 rounded-full bg-white/20" />
            <div className="h-1.5 w-1/2 rounded-full bg-white/10" />
          </div>
        </div>
        {large && (
          <div className="mt-6 space-y-3">
            {[80, 60, 90].map((width) => (
              <div key={width} className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 rounded-full ${finance ? 'bg-emerald-400/70' : privacy ? 'bg-sky-400/70' : 'bg-indigo-400/70'}`}
                />
                <span className="h-1.5 rounded-full bg-white/10" style={{ width: `${width}%` }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
