export interface WhatsAppReportMessage {
  id: string
  to_number: string
  contact_name: string | null
  message: string
  status: string
  error?: string | null
  company_id?: string | null
  created_at: string
}

export interface WhatsAppReportSummary {
  total: number
  sent: number
  pending: number
  failed: number
}

export async function exportWhatsAppReportPDF(
  summary: WhatsAppReportSummary,
  messages: WhatsAppReportMessage[],
  filenameBase: string
) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 32
  let y = margin

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor(20, 20, 20)
  pdf.text('WhatsApp Campaign Report', margin, y)
  y += 18
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(120, 120, 120)
  pdf.text(`Generated ${new Date().toLocaleString('en-IN')}`, margin, y)
  y += 26

  // ── Summary cards ──────────────────────────────────────────────────────
  const cards: [string, number, [number, number, number]][] = [
    ['Total', summary.total, [60, 60, 60]],
    ['Sent', summary.sent, [22, 163, 74]],
    ['Pending', summary.pending, [217, 119, 6]],
    ['Failed', summary.failed, [220, 38, 38]],
  ]
  const cardWidth = 130
  const cardHeight = 50
  cards.forEach(([label, value, color], i) => {
    const x = margin + i * (cardWidth + 12)
    pdf.setDrawColor(220, 220, 220)
    pdf.roundedRect(x, y, cardWidth, cardHeight, 6, 6)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(...color)
    pdf.text(String(value), x + 12, y + 28)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(120, 120, 120)
    pdf.text(label, x + 12, y + 42)
  })
  y += cardHeight + 26

  // ── Message table ───────────────────────────────────────────────────────
  const columns = [
    { label: 'Number', width: 100 },
    { label: 'Name', width: 110 },
    { label: 'Message', width: 260 },
    { label: 'Status', width: 60 },
    { label: 'Error', width: 130 },
    { label: 'Time', width: 110 },
  ]

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

  for (const m of messages) {
    if (y > pageHeight - margin) {
      pdf.addPage()
      y = margin
      drawHeader()
    }
    let x = margin
    const cells = [
      m.to_number || '-',
      m.contact_name || '-',
      m.message || '-',
      m.status || '-',
      m.error || '-',
      new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
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
