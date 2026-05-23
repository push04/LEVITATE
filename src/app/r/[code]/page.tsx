import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServiceSupabase } from '@/lib/supabase';

export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const cookieStore = await cookies();
    const supabase = getServiceSupabase();

    cookieStore.set('referral_code', code, { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax' });

    const { data: referral } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('referral_code', code)
        .single();

    let referrerName = 'a friend';
    if (referral?.referrer_id) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', referral.referrer_id)
            .single();
        if (profile?.full_name) referrerName = profile.full_name;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4">
            <div className="max-w-md text-center">
                <h1 className="type-hero text-[var(--text-primary)]">
                    You were referred by {referrerName}
                </h1>
                <p className="mt-4 type-body text-[var(--text-secondary)]">
                    Start your free trial and experience the platform today.
                </p>
                <Link
                    href="/trial"
                    className="mt-8 inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-6 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3)] transition-transform hover:translate-y-[-1px] hover:brightness-105"
                >
                    Start free trial
                </Link>
            </div>
        </div>
    );
}
