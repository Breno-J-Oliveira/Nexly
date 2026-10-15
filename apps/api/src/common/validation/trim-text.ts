import { Transform } from 'class-transformer';

/** Normaliza campos de texto antes da validação; null permite apagar um campo opcional. */
export function TrimText(options: { nullable?: boolean; lowercase?: boolean } = {}) {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed && options.nullable) return null;
    return options.lowercase ? trimmed.toLowerCase() : trimmed;
  });
}
