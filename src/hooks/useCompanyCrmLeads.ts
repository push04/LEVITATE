'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BusinessLeadRecord } from '@/hooks/useBusinessLeadRecords'

export type CompanyCrmStage = {
  id: string
  company_id: string
  stage_key: string
  label: string
  color_token: string | null
  sort_order: number
  is_default: boolean
  is_closed_stage: boolean
}

export type CompanyCrmLead = {
  id: string
  company_id: string
  owner_user_id: string | null
  source_lead_id: string | null
  copied_from: string
  source_snapshot: Record<string, unknown> | null
  name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  company_name: string | null
  title: string | null
  city: string | null
  service_category: string | null
  status: string
  pipeline_stage: string
  tags: string[]
  notes: string | null
  estimated_value: number
  quoted_price: number | null
  negotiated_price: number | null
  currency: string
  source_url: string | null
  priority: string | null
  assigned_to: string | null
  last_contacted_at: string | null
  copied_at: string
  created_at: string
  updated_at: string
}

type UseCompanyCrmLeadsResult = {
  leads: CompanyCrmLead[]
  stages: CompanyCrmStage[]
  storageMode: 'remote' | 'local'
  loading: boolean
  error: string
  reload: () => Promise<void>
  copyLeadToCrm: (sourceLeadId: string, sourceLead?: BusinessLeadRecord) => Promise<CompanyCrmLead | null>
  updateLead: (leadId: string, updates: Partial<CompanyCrmLead>) => Promise<CompanyCrmLead | null>
  deleteLead: (leadId: string) => Promise<boolean>
  sourceLeadIds: Set<string>
  stats: {
    total: number
    newCount: number
    engaged: number
    closed: number
    totalValue: number
  }
}

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? '').toLowerCase()
}

function normalizeNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const coerced = Number(value)
  return Number.isFinite(coerced) ? coerced : fallback
}

function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  return normalizeNumber(value, 0)
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry)).filter(Boolean)
}

function normalizePipelineStage(value: unknown) {
  if (typeof value === 'string') {
    const s = value.trim();
    if (s.toLowerCase() === '[object object]') return 'new';
    return s;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const stageKey =
      (typeof record.stage_key === 'string' && record.stage_key) ||
      (typeof record.stageKey === 'string' && record.stageKey) ||
      (typeof record.key === 'string' && record.key)
    if (stageKey) return stageKey
    if (typeof record.label === 'string' && record.label) return record.label
  }
  return 'new'
}

function normalizeCompanyCrmLead(raw: unknown): CompanyCrmLead {
  const record = (raw ?? {}) as Partial<CompanyCrmLead> & Record<string, unknown>
  const pipelineStage = normalizePipelineStage(record.pipeline_stage)
  const normalizedStatus = typeof record.status === 'string' && record.status ? record.status : pipelineStage

  return {
    ...(record as CompanyCrmLead),
    company_name: typeof record.company_name === 'string' ? record.company_name : typeof record.company_name === 'object' && record.company_name ? JSON.stringify(record.company_name) : null,
    city: typeof record.city === 'string' ? record.city : typeof record.city === 'object' && record.city ? JSON.stringify(record.city) : null,
    service_category: typeof record.service_category === 'string' ? record.service_category : typeof record.service_category === 'object' && record.service_category ? JSON.stringify(record.service_category) : null,
    status: normalizedStatus,
    pipeline_stage: pipelineStage,
    tags: normalizeStringArray(record.tags),
    estimated_value: normalizeNumber(record.estimated_value, 0),
    quoted_price: normalizeNullableNumber(record.quoted_price),
    negotiated_price: normalizeNullableNumber(record.negotiated_price),
  }
}

function leadCommercialValue(lead: CompanyCrmLead) {
  return lead.negotiated_price ?? lead.quoted_price ?? lead.estimated_value ?? 0
}

const DEFAULT_LOCAL_STAGES: CompanyCrmStage[] = [
  {
    id: 'local-stage-new',
    company_id: 'local-company',
    stage_key: 'new',
    label: 'New',
    color_token: 'status-new',
    sort_order: 1,
    is_default: true,
    is_closed_stage: false,
  },
  {
    id: 'local-stage-contacted',
    company_id: 'local-company',
    stage_key: 'contacted',
    label: 'Contacted',
    color_token: 'status-progress',
    sort_order: 2,
    is_default: true,
    is_closed_stage: false,
  },
  {
    id: 'local-stage-proposal',
    company_id: 'local-company',
    stage_key: 'proposal',
    label: 'Proposal Sent',
    color_token: 'gold-base',
    sort_order: 3,
    is_default: true,
    is_closed_stage: false,
  },
  {
    id: 'local-stage-won',
    company_id: 'local-company',
    stage_key: 'won',
    label: 'Won',
    color_token: 'status-closed',
    sort_order: 4,
    is_default: true,
    is_closed_stage: true,
  },
  {
    id: 'local-stage-lost',
    company_id: 'local-company',
    stage_key: 'lost',
    label: 'Lost',
    color_token: 'status-warn',
    sort_order: 5,
    is_default: true,
    is_closed_stage: true,
  },
]

function normalizeScopeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'business'
}

function localStorageKey(scopeKey: string) {
  return `levitateos.company-crm.${normalizeScopeKey(scopeKey)}`
}

function isSchemaMissingMessage(message: string) {
  return /crm schema is not installed|company_crm_/i.test(message)
}

function normalizeSourceStatus(status: string | null | undefined) {
  const normalized = String(status ?? 'new').trim().toLowerCase()
  if (normalized === 'closed' || normalized === 'won') return 'won'
  if (normalized === 'contacted' || normalized === 'follow up' || normalized === 'follow_up') return 'contacted'
  if (normalized === 'proposal' || normalized === 'proposal_sent') return 'proposal'
  if (normalized === 'lost') return 'lost'
  return 'new'
}

function readLocalCrm(scopeKey: string) {
  if (typeof window === 'undefined') {
    return {
      leads: [] as CompanyCrmLead[],
      stages: DEFAULT_LOCAL_STAGES,
    }
  }

  try {
    const raw = window.localStorage.getItem(localStorageKey(scopeKey))
    if (!raw) {
      return {
        leads: [] as CompanyCrmLead[],
        stages: DEFAULT_LOCAL_STAGES,
      }
    }

    const parsed = JSON.parse(raw) as {
      leads?: CompanyCrmLead[]
      stages?: CompanyCrmStage[]
    }

    return {
      leads: Array.isArray(parsed?.leads) ? parsed.leads : [],
      stages: Array.isArray(parsed?.stages) && parsed.stages.length > 0 ? parsed.stages : DEFAULT_LOCAL_STAGES,
    }
  } catch {
    return {
      leads: [] as CompanyCrmLead[],
      stages: DEFAULT_LOCAL_STAGES,
    }
  }
}

function writeLocalCrm(scopeKey: string, data: { leads: CompanyCrmLead[]; stages: CompanyCrmStage[] }) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(localStorageKey(scopeKey), JSON.stringify(data))
}

export function useCompanyCrmLeads(enabled: boolean, scopeKey = 'default'): UseCompanyCrmLeadsResult {
  const [leads, setLeads] = useState<CompanyCrmLead[]>([])
  const [stages, setStages] = useState<CompanyCrmStage[]>([])
  const [storageMode, setStorageMode] = useState<'remote' | 'local'>('remote')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!enabled) {
      setLeads([])
      setStages([])
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/business/crm/leads', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to load CRM leads')
      }

      const nextStages = Array.isArray(payload.data?.stages) ? (payload.data.stages as CompanyCrmStage[]) : []
      const rawLeads = Array.isArray(payload.data?.leads) ? payload.data.leads : []
      const nextLeads = rawLeads.map(normalizeCompanyCrmLead)

      setLeads(nextLeads)
      setStages(nextStages)
      setStorageMode('remote')
    } catch (nextError) {
      console.error('Failed to load company CRM:', nextError)
      const message = nextError instanceof Error ? nextError.message : 'Unable to load CRM leads'

      if (isSchemaMissingMessage(message)) {
        const localCrm = readLocalCrm(scopeKey)
        setLeads(localCrm.leads)
        setStages(localCrm.stages)
        setStorageMode('local')
        setError('')
      } else {
        setLeads([])
        setStages([])
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }, [enabled, scopeKey])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const targetKey = localStorageKey(scopeKey)
    function onStorage(event: StorageEvent) {
      if (event.key !== targetKey) {
        return
      }

      const nextState = readLocalCrm(scopeKey)
      setLeads(nextState.leads)
      setStages(nextState.stages)
      setStorageMode('local')
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [scopeKey])

  const copyLeadLocally = useCallback(async (sourceLeadId: string, sourceLead?: BusinessLeadRecord) => {
    if (!sourceLead) {
      throw new Error('Lead details are required for local CRM storage')
    }

    const current = readLocalCrm(scopeKey)
    const existing = current.leads.find((lead) => lead.source_lead_id === sourceLeadId)
    if (existing) {
      return existing
    }

    const now = new Date().toISOString()
    const nextLead: CompanyCrmLead = {
      id: `local-${sourceLeadId}`,
      company_id: 'local-company',
      owner_user_id: null,
      source_lead_id: sourceLeadId,
      copied_from: 'global_leads',
      source_snapshot: sourceLead as unknown as Record<string, unknown>,
      name: sourceLead.name,
      email: sourceLead.email ?? null,
      phone: sourceLead.phone ?? null,
      whatsapp: sourceLead.phone ?? null,
      company_name: sourceLead.business_name ?? null,
      title: null,
      city: sourceLead.city ?? null,
      service_category: sourceLead.service_category ?? null,
      status: normalizeSourceStatus(sourceLead.status),
      pipeline_stage: normalizeSourceStatus(sourceLead.status),
      tags: [sourceLead.source || 'global lead'],
      notes: sourceLead.notes || sourceLead.message || null,
      estimated_value: sourceLead.deal_value ?? 0,
      quoted_price: sourceLead.deal_value ?? null,
      negotiated_price: null,
      currency: 'INR',
      source_url: sourceLead.website_link ?? sourceLead.google_map_link ?? null,
      priority: (sourceLead.ai_score ?? 0) >= 75 ? 'high' : (sourceLead.ai_score ?? 0) >= 45 ? 'medium' : 'low',
      assigned_to: null,
      last_contacted_at: null,
      copied_at: now,
      created_at: now,
      updated_at: now,
    }

    const nextState = {
      leads: [nextLead, ...current.leads],
      stages: current.stages,
    }
    writeLocalCrm(scopeKey, nextState)
    setLeads(nextState.leads)
    setStages(nextState.stages)
    return nextLead
  }, [scopeKey])

  const updateLeadLocally = useCallback(async (leadId: string, updates: Partial<CompanyCrmLead>) => {
    const current = readLocalCrm(scopeKey)
    const existing = current.leads.find((lead) => lead.id === leadId)
    if (!existing) {
      throw new Error('CRM lead not found')
    }

    const nextLead: CompanyCrmLead = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const nextState = {
      leads: current.leads.map((lead) => (lead.id === leadId ? nextLead : lead)),
      stages: current.stages,
    }
    writeLocalCrm(scopeKey, nextState)
    setLeads(nextState.leads)
    setStages(nextState.stages)
    return nextLead
  }, [scopeKey])

  const deleteLeadLocally = useCallback(async (leadId: string) => {
    const current = readLocalCrm(scopeKey)
    const existing = current.leads.find((lead) => lead.id === leadId)
    if (!existing) {
      throw new Error('CRM lead not found')
    }

    const nextState = {
      leads: current.leads.filter((lead) => lead.id !== leadId),
      stages: current.stages,
    }

    writeLocalCrm(scopeKey, nextState)
    setLeads(nextState.leads)
    setStages(nextState.stages)
    return true
  }, [scopeKey])

  const copyLeadToCrm = useCallback(async (sourceLeadId: string, sourceLead?: BusinessLeadRecord) => {
    if (storageMode === 'local') {
      return copyLeadLocally(sourceLeadId, sourceLead)
    }

    const response = await fetch('/api/business/crm/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceLeadId }),
    })
    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      const message = payload?.error || 'Unable to copy lead into CRM'
      if (isSchemaMissingMessage(message)) {
        setStorageMode('local')
        return copyLeadLocally(sourceLeadId, sourceLead)
      }
      throw new Error(message)
    }

    const nextLead = payload.data as CompanyCrmLead
    setLeads((current) => {
      const existing = current.find((lead) => lead.id === nextLead.id)
      if (existing) {
        return current.map((lead) => (lead.id === nextLead.id ? nextLead : lead))
      }

      return [nextLead, ...current]
    })
    return nextLead
  }, [copyLeadLocally, storageMode])

  const updateLead = useCallback(async (leadId: string, updates: Partial<CompanyCrmLead>) => {
    if (storageMode === 'local') {
      return updateLeadLocally(leadId, updates)
    }

    const response = await fetch(`/api/business/crm/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      const message = payload?.error || 'Unable to update CRM lead'
      if (isSchemaMissingMessage(message)) {
        setStorageMode('local')
        return updateLeadLocally(leadId, updates)
      }
      throw new Error(message)
    }

    const nextLead = payload.data as CompanyCrmLead
    setLeads((current) => current.map((lead) => (lead.id === nextLead.id ? nextLead : lead)))
    return nextLead
  }, [storageMode, updateLeadLocally])

  const deleteLead = useCallback(async (leadId: string) => {
    if (storageMode === 'local') {
      return deleteLeadLocally(leadId)
    }

    const response = await fetch(`/api/business/crm/leads/${leadId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      const message = payload?.error || 'Unable to delete CRM lead'
      if (isSchemaMissingMessage(message)) {
        setStorageMode('local')
        return deleteLeadLocally(leadId)
      }
      throw new Error(message)
    }

    setLeads((current) => current.filter((lead) => lead.id !== leadId))
    return true
  }, [deleteLeadLocally, storageMode])

  const sourceLeadIds = useMemo(
    () =>
      new Set(
        leads
          .map((lead) => lead.source_lead_id)
          .filter((value): value is string => Boolean(value))
      ),
    [leads]
  )

  const stats = useMemo(() => ({
    total: leads.length,
    newCount: leads.filter((lead) => normalizeStatus(lead.pipeline_stage) === 'new').length,
    engaged: leads.filter((lead) => ['contacted', 'proposal'].includes(normalizeStatus(lead.pipeline_stage))).length,
    closed: leads.filter((lead) => ['won', 'lost', 'closed'].includes(normalizeStatus(lead.pipeline_stage))).length,
    totalValue: leads.reduce((sum, lead) => sum + leadCommercialValue(lead), 0),
  }), [leads])

  return {
    leads,
    stages,
    storageMode,
    loading,
    error,
    reload: load,
    copyLeadToCrm,
    updateLead,
    deleteLead,
    sourceLeadIds,
    stats,
  }
}
