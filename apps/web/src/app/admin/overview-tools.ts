function spreadsheetCell(value: string | number): string {
  const text = String(value);
  const firstContent = Array.from(text).find(
    (character) => character.charCodeAt(0) > 32 && character.trim(),
  );
  const formulaPrefix = firstContent !== undefined && '=+-@＝＋－＠'.includes(firstContent);
  const startsWithControl = ['\t', '\r', '\n'].includes(text.charAt(0));
  const escaped =
    typeof value === 'string' && (formulaPrefix || startsWithControl) ? `'${text}` : text;
  return `"${escaped.replaceAll('"', '""')}"`;
}

export function downloadCsv(fileName: string, rows: Array<Array<string | number>>): void {
  const buffer = ['\uFEFF', rows.map((row) => row.map(spreadsheetCell).join(';')).join('\r\n')];
  const url = URL.createObjectURL(new Blob(buffer, { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
