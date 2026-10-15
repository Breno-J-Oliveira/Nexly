'use client';
import { MODULES, PRESETS, normalizeModules, toggleModule, ModuleId } from '@nexly/shared';

export function ModulePicker({
  preset,
  modulos,
  onChange,
  disabled = false,
}: {
  preset: string;
  modulos: string[];
  onChange: (preset: string, modulos: ModuleId[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-5">
      <label className="block text-sm text-[#A1A1AA]">
        Comece por um modelo
        <select
          aria-label="Modelo do negócio"
          disabled={disabled}
          value={preset}
          onChange={(e) => {
            const p = PRESETS.find((item) => item.id === e.target.value)!;
            onChange(p.id, normalizeModules(p.modulos));
          }}
          className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181F] p-3 text-sm text-white"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-relaxed text-[#A1A1AA]">
        {PRESETS.find((p) => p.id === preset)?.descricao} Você pode ajustar cada recurso.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MODULES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            aria-pressed={modulos.includes(m.id)}
            title={m.descricao}
            onClick={() => onChange(preset, toggleModule(modulos, m.id))}
            className={`min-h-14 rounded-lg border p-3 text-left text-sm transition-colors ${modulos.includes(m.id) ? 'border-[#6366F1]/30 bg-[#6366F1]/20 text-[#A5B4FC]' : 'border-white/5 bg-[#18181F] text-[#A1A1AA]'}`}
          >
            {m.nome}
            <span className="sr-only"> — {m.descricao}</span>
          </button>
        ))}

      </div>
      <p className="text-xs leading-relaxed text-[#71717A]">
        Agenda inclui clientes, equipe e serviços. PDV inclui produtos, vendas e clientes. Ao
        retirar um recurso necessário, os recursos que dependem dele também são retirados. Seus
        dados existentes são preservados.
      </p>
      <details className="rounded-lg border border-white/5 p-3">
        <summary className="cursor-pointer text-xs text-[#A1A1AA]">O que cada função faz?</summary>
        <dl className="mt-3 space-y-3">
          {MODULES.map((m) => (
            <div key={m.id}>
              <dt className="text-sm font-medium">{m.nome}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">{m.descricao}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
