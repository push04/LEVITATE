'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type BusinessLeadRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  ai_score: number | null;
  service_category: string | null;
  status: string | null;
  created_at: string;
  business_type: string | null;
  city: string | null;
  google_map_link: string | null;
  website_link: string | null;
  notes: string | null;
  deal_value: number | null;
  budget: string | null;
  message: string | null;
  source: string | null;
  outreach_count: number | null;
  last_outreach_at: string | null;
  company_id?: string | null;
};

function isMissingColumnError(error: unknown) {
  const msg =
    typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
      ? error.message.toLowerCase()
      : '';
  return msg.includes('column') && msg.includes('does not exist');
}

export function useBusinessLeadRecords(enabled: boolean, companyId?: string | null) {
  const [records, setRecords] = useState<BusinessLeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!enabled) {
        if (active) {
          setRecords([]);
          setLoading(false);
        }
        return;
      }

      try {
        if (active) {
          setLoading(true);
        }

        const baseSelect =
          'id, name, email, phone, ai_score, service_category, status, created_at, business_type, city, google_map_link, website_link, notes, deal_value, budget, message, source, outreach_count, last_outreach_at';

        const run = async (scoped: boolean) => {
          let q = supabase.from('leads').select(baseSelect).order('created_at', { ascending: false });
          if (scoped && companyId) q = q.eq('company_id', companyId);
          const { data, error } = await q;
          if (error) throw error;
          return (data ?? []) as BusinessLeadRecord[];
        };

        let data: BusinessLeadRecord[] = [];
        try {
          data = await run(Boolean(companyId));
        } catch (err) {
          if (companyId && isMissingColumnError(err)) {
            data = await run(false);
          } else {
            throw err;
          }
        }

        if (active) {
          setRecords((data ?? []) as BusinessLeadRecord[]);
        }
      } catch (error) {
        console.error('Failed to load business leads:', error);
        if (active) {
          setRecords([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [enabled, companyId]);

  const stats = useMemo(() => {
    const normalize = (value: string | null | undefined) => String(value || '').toLowerCase();
    const isClosed = (status: string) => ['closed', 'won', 'lost', 'done', 'paid'].includes(status);
    const isEngaged = (status: string) => ['contacted', 'follow up', 'follow_up', 'in progress', 'in_progress'].includes(status);

    return {
      total: records.length,
      newCount: records.filter((record) => normalize(record.status) === 'new').length,
      engaged: records.filter((record) => isEngaged(normalize(record.status))).length,
      closed: records.filter((record) => isClosed(normalize(record.status))).length,
      totalValue: records.reduce((sum, record) => sum + (typeof record.deal_value === 'number' ? record.deal_value : 0), 0),
    };
  }, [records]);

  const updateStatus = async (leadId: string, nextStatus: string) => {
    const normalizedNext = String(nextStatus ?? '').trim();
    if (!leadId || !normalizedNext) {
      throw new Error('Lead id and status are required')
    }

    const previous = records.find((record) => record.id === leadId) ?? null
    setUpdatingId(leadId)
    setRecords((current) => current.map((record) => (record.id === leadId ? { ...record, status: normalizedNext } : record)))

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: normalizedNext })
        .eq('id', leadId)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Failed to update lead status:', error)
      if (previous) {
        setRecords((current) => current.map((record) => (record.id === leadId ? previous : record)))
      }
      throw error instanceof Error ? error : new Error('Unable to update lead status')
    } finally {
      setUpdatingId((current) => (current === leadId ? null : current))
    }
  }

  return {
    records,
    loading,
    stats,
    updatingId,
    updateStatus,
  };
}
