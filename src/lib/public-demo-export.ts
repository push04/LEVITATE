// CSV/PDF export for the public BizHarvest/TenderPulse demo results.
// Deliberately separate from src/lib/bizharvest-export.ts, which exports
// internal-only fields (status, deal value) that have no place in a public,
// masked, capped-at-10-rows export.

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\r\n');
}

async function toPdf(rows: Record<string, unknown>[], title: string, filenameBase: string) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 32;
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const colWidth = headers.length > 0 ? (pageWidth - margin * 2) / headers.length : 0;
  let y = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(20, 20, 20);
  pdf.text(title, margin, y);
  y += 16;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`${rows.length} results - Levitate Labs demo, ${new Date().toLocaleString('en-IN')}`, margin, y);
  y += 22;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(30, 30, 30);
  let x = margin;
  headers.forEach((h) => {
    pdf.text(h, x, y);
    x += colWidth;
  });
  y += 6;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 14;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(50, 50, 50);

  for (const row of rows) {
    x = margin;
    headers.forEach((h) => {
      const fitted = pdf.splitTextToSize(String(row[h] ?? '-'), colWidth - 6)[0] ?? '';
      pdf.text(fitted, x, y);
      x += colWidth;
    });
    y += 16;
  }

  pdf.save(`${filenameBase}.pdf`);
}

export async function exportDemoResultsCSV(rows: Record<string, unknown>[], filenameBase: string) {
  triggerDownload(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }), `${filenameBase}.csv`);
}

export async function exportDemoResultsPDF(rows: Record<string, unknown>[], title: string, filenameBase: string) {
  await toPdf(rows, title, filenameBase);
}
