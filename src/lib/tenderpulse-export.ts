import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun } from 'docx'
import type { TenderRow } from './tenderpulse-analytics'

const COLUMNS: { key: keyof TenderRow | 'source'; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'organization', label: 'Organization' },
  { key: 'district', label: 'District' },
  { key: 'category', label: 'Category' },
  { key: 'bid_submission_deadline', label: 'Deadline' },
  { key: 'publish_date', label: 'Published' },
  { key: 'external_ref', label: 'Reference No' },
  { key: 'nit_document_url', label: 'Document URL' },
  { key: 'source', label: 'Source' },
]

function cell(t: TenderRow, key: string): string {
  if (key === 'source') return t.sources?.name ?? ''
  return String((t as any)[key] ?? '')
}

export function tendersToCsv(tenders: TenderRow[]): string {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const header = COLUMNS.map((c) => c.label).join(',')
  const rows = tenders.map((t) => COLUMNS.map((c) => escape(cell(t, c.key))).join(','))
  return [header, ...rows].join('\n')
}

export function tendersToXlsx(tenders: TenderRow[]): Buffer {
  const data = tenders.map((t) => Object.fromEntries(COLUMNS.map((c) => [c.label, cell(t, c.key)])))
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = COLUMNS.map(() => ({ wch: 28 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Tenders')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export async function tendersToDocx(tenders: TenderRow[], title = 'Tender List'): Promise<Buffer> {
  const headerRow = new TableRow({
    tableHeader: true,
    children: ['Title', 'Organization', 'District', 'Category', 'Deadline', 'Reference No'].map(
      (text) =>
        new TableCell({
          shading: { fill: 'EFEFEF' },
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        })
    ),
  })

  const rows = tenders.map(
    (t) =>
      new TableRow({
        children: [t.title, t.organization || '', t.district || '', t.category || '', t.bid_submission_deadline || '', t.external_ref].map(
          (text) => new TableCell({ children: [new Paragraph(String(text ?? ''))] })
        ),
      })
  )

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `${tenders.length} tenders · generated ${new Date().toLocaleString()}` }),
          new Paragraph({ text: '' }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}

export function tendersToPdf(tenders: TenderRow[], title = 'Tender List'): Buffer {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 32
  const colWidths = [220, 140, 90, 80, 90, 110]
  const colLabels = ['Title', 'Organization', 'District', 'Category', 'Deadline', 'Reference No']
  const colKeys: (keyof TenderRow)[] = ['title', 'organization', 'district', 'category', 'bid_submission_deadline', 'external_ref']

  let y = margin

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text(title, margin, y)
  y += 18
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(120)
  pdf.text(`${tenders.length} tenders · generated ${new Date().toLocaleString()}`, margin, y)
  y += 16

  const drawHeader = () => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(30)
    pdf.setFillColor(240, 240, 240)
    pdf.rect(margin, y, colWidths.reduce((a, b) => a + b, 0), 16, 'F')
    let x = margin
    colLabels.forEach((label, i) => {
      pdf.text(label, x + 4, y + 11)
      x += colWidths[i]
    })
    y += 16
  }

  drawHeader()
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(20)

  for (const t of tenders) {
    if (y > pageHeight - margin) {
      pdf.addPage()
      y = margin
      drawHeader()
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(20)
    }
    let x = margin
    const rowLines = colKeys.map((key, i) => {
      const text = String((t as any)[key] ?? '')
      return pdf.splitTextToSize(text, colWidths[i] - 8)
    })
    const rowHeight = Math.max(14, Math.max(...rowLines.map((l) => l.length)) * 9)
    colKeys.forEach((_, i) => {
      pdf.text(rowLines[i], x + 4, y + 9)
      x += colWidths[i]
    })
    pdf.setDrawColor(230)
    pdf.line(margin, y + rowHeight, margin + colWidths.reduce((a, b) => a + b, 0), y + rowHeight)
    y += rowHeight
  }

  return Buffer.from(pdf.output('arraybuffer'))
}
