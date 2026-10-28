export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const cell = (value: unknown) => {
    const text = value == null ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
export function parseCsv(text: string): Record<string, string>[] {
  const input = text.replace(/^\uFEFF/, ''); const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted && c === '"' && input[i + 1] === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && input[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(v => v !== '')) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(v => v !== '')) rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, ' '));
  return rows.slice(1).map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
}
export function readCsvFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(parseCsv(String(reader.result ?? ''))); reader.onerror = () => reject(new Error('Could not read file')); reader.readAsText(file); });
}
