function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Builds and downloads a CSV file from an array of flat objects, client-side only. */
export function downloadCsv<T extends object>(filename: string, columns: { key: keyof T & string; label: string }[], rows: T[]) {
  const header = columns.map(c => escapeCsvCell(c.label)).join(',');
  const lines = rows.map(row => columns.map(c => escapeCsvCell(row[c.key])).join(','));
  const csv = [header, ...lines].join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
