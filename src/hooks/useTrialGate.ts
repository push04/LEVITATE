'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export function useTrialGate() {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('workspaces').select('plan').eq('owner_id', user.id).single();
      setPlan(data?.plan ?? null);
      setLoading(false);
    }
    check();
  }, []);

  const isTrial = plan === 'trial';
  const canRead = !plan || plan === 'trial' || plan === 'starter' || plan === 'growth' || plan === 'scale';
  const canWrite = plan && plan !== 'trial';

  return { plan, isTrial, canRead, canWrite, loading };
}
