/** Campos textuais são neutralizados para não executar fórmulas na planilha. */
export function csvCell(value: string | number, text = false): string {
  let cell = String(value);
  if (text && /^[\s\u0000-\u001f]*[=+@-]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}
