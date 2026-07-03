import type { TenderRow } from './tenderpulse-analytics'

export interface TenderClient {
  id: string
  company_name: string
  email: string
  districts: string[]
  categories: string[]
  keywords: string[]
  min_value: number | null
  max_value: number | null
}

export function tenderMatchesClient(tender: TenderRow, client: TenderClient): boolean {
  if (tender.is_hidden) return false

  if (client.districts.length && !client.districts.some((d) => tender.district?.toLowerCase() === d.toLowerCase())) {
    return false
  }
  if (client.categories.length && !client.categories.includes(tender.category || 'other')) {
    return false
  }
  if (client.keywords.length) {
    const hay = `${tender.title} ${tender.organization ?? ''}`.toLowerCase()
    if (!client.keywords.some((k) => hay.includes(k.toLowerCase()))) return false
  }
  if (tender.estimated_value_inr != null) {
    if (client.min_value != null && tender.estimated_value_inr < client.min_value) return false
    if (client.max_value != null && tender.estimated_value_inr > client.max_value) return false
  }
  return true
}

export function matchTendersForClient(tenders: TenderRow[], client: TenderClient): TenderRow[] {
  return tenders.filter((t) => tenderMatchesClient(t, client))
}

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export function buildDigestHtml(companyName: string, tenders: TenderRow[]): string {
  const rows = tenders
    .map(
      (t) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(t.title)}<br/>
          <span style="color:#666;font-size:12px;">${escapeHtml(t.organization || '')} &middot; ${escapeHtml(t.district || '')}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(t.category || '')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(t.bid_submission_deadline?.slice(0, 10) || '—')}</td>
      </tr>`
    )
    .join('')
  return `<div style="font-family:Arial,sans-serif;max-width:640px;">
    <h2 style="margin-bottom:4px;">${companyName ? escapeHtml(companyName) + ' — ' : ''}Tender Digest</h2>
    <p style="color:#666;margin-top:0;">${tenders.length} tenders matching your filters, from Bihar &amp; Jharkhand government sources.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f5f5f5;"><th style="padding:8px;text-align:left;">Tender</th><th style="padding:8px;text-align:left;">Category</th><th style="padding:8px;text-align:left;">Deadline</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}
