import { getServiceSupabase } from '@/lib/supabase'

export function getCompanyEmailAlias(workspaceSlug: string) {
  return `business.${workspaceSlug}@levitatelabs.online`
}

/** Extracts the workspace slug from a business.<slug>@levitatelabs.online address, or null. */
export function parseCompanyEmailAlias(address: string): string | null {
  const match = /^business\.([a-z0-9-]+)@levitatelabs\.online$/i.exec(address.trim())
  return match ? match[1].toLowerCase() : null
}

export type CompanyMailboxInfo = {
  companyId: string
  alias: string
  ownerEmail: string | null
  companyName: string | null
}

type SlugSourceRow = {
  workspace_slug?: string | null
  subdomain_slug?: string | null
  notes?: Record<string, unknown> | null
}

/**
 * Same fallback chain business-portal.ts uses for workspace slug resolution:
 * the direct column first, then the notes JSON (older signups only ever wrote
 * the slug into notes, never backfilled the column).
 */
function resolveSlugFromRow(row: SlugSourceRow | null | undefined): string | null {
  if (!row) return null
  const notes = row.notes && typeof row.notes === 'object' ? row.notes : {}
  return (
    row.workspace_slug ||
    row.subdomain_slug ||
    (typeof notes.workspace_slug === 'string' ? notes.workspace_slug : null) ||
    (typeof notes.subdomain_slug === 'string' ? notes.subdomain_slug : null) ||
    null
  )
}

/**
 * Resolves a company's branded email alias + owner contact email from its most
 * recent onboarding record.
 *
 * onboarding_subscriptions has NO company_id column — that value only ever
 * lives inside the `notes` JSONB column (see src/app/api/onboard/checkout/route.ts
 * and src/lib/business-portal.ts, which use the same `.contains('notes', ...)`
 * pattern rather than `.eq('company_id', ...)`, which would error).
 */
export async function resolveCompanyMailboxInfo(companyId: string): Promise<CompanyMailboxInfo | null> {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from('onboarding_subscriptions')
    .select('workspace_slug, subdomain_slug, notes, email, company_name')
    .contains('notes', { company_id: companyId })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const slug = resolveSlugFromRow(data)
  if (!slug) return null

  return {
    companyId,
    alias: getCompanyEmailAlias(slug),
    ownerEmail: data?.email ?? null,
    companyName: data?.company_name ?? null,
  }
}

/** Resolves a company by its business email alias's workspace slug (used by inbound mail sync). */
export async function resolveCompanyByWorkspaceSlug(slug: string): Promise<CompanyMailboxInfo | null> {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from('onboarding_subscriptions')
    .select('email, company_name, workspace_slug, subdomain_slug, notes')
    .or(`workspace_slug.eq.${slug},subdomain_slug.eq.${slug},notes->>workspace_slug.eq.${slug},notes->>subdomain_slug.eq.${slug}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const notes = (data?.notes && typeof data.notes === 'object' ? data.notes : {}) as Record<string, unknown>
  const companyId = typeof notes.company_id === 'string' ? notes.company_id : null
  if (!companyId) return null

  return {
    companyId,
    alias: getCompanyEmailAlias(slug),
    ownerEmail: data?.email ?? null,
    companyName: data?.company_name ?? null,
  }
}
