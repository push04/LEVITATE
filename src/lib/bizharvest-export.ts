export interface ExportableLead {
  id: string
  name: string
  city: string | null
  category: string | null
  phone: string | null
  website: string | null
  status: string
  rating: number | null
  reviewCount: number | null
  dealValue: number | null
  source: string
  createdAt: string
}

function toRows(leads: ExportableLead[]) {
  return leads.map(l => ({
    Name: l.name,
    Phone: l.phone ?? '',
    City: l.city ?? '',
    Category: l.category ?? '',
    Rating: l.rating ?? '',
    Reviews: l.reviewCount ?? '',
    Status: l.status,
    Website: l.website ?? '',
    Source: l.source,
    'Scraped Date': new Date(l.createdAt).toLocaleDateString('en-IN'),
  }))
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportLeadsCSV(leads: ExportableLead[], filenameBase: string) {
  const Papa = (await import('papaparse')).default
  const csv = Papa.unparse(toRows(leads))
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filenameBase}.csv`)
}

export async function exportLeadsXLSX(leads: ExportableLead[], filenameBase: string) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(toRows(leads))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leads')
  XLSX.writeFile(wb, `${filenameBase}.xlsx`)
}

export async function exportLeadsPDF(leads: ExportableLead[], filenameBase: string, title: string) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 32
  const columns = [
    { label: 'Name', width: 170 },
    { label: 'Phone', width: 90 },
    { label: 'City', width: 90 },
    { label: 'Category', width: 140 },
    { label: 'Rating', width: 50 },
    { label: 'Status', width: 70 },
    { label: 'Source', width: 60 },
  ]
  let y = margin

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(20, 20, 20)
  pdf.text(title, margin, y)
  y += 16
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(120, 120, 120)
  pdf.text(`${leads.length} leads - generated ${new Date().toLocaleString('en-IN')}`, margin, y)
  y += 22

  function drawHeader() {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(30, 30, 30)
    let x = margin
    columns.forEach(c => { pdf.text(c.label, x, y); x += c.width })
    y += 6
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 14
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(50, 50, 50)
  }

  drawHeader()

  for (const l of leads) {
    if (y > pageHeight - margin) {
      pdf.addPage()
      y = margin
      drawHeader()
    }
    let x = margin
    const cells = [
      l.name || '-',
      l.phone || '-',
      l.city || '-',
      l.category || '-',
      l.rating ? String(l.rating) : '-',
      l.status || '-',
      l.source || '-',
    ]
    cells.forEach((cell, i) => {
      const fitted = pdf.splitTextToSize(String(cell), columns[i].width - 6)[0] ?? ''
      pdf.text(fitted, x, y)
      x += columns[i].width
    })
    y += 16
  }

  pdf.save(`${filenameBase}.pdf`)
}
