import { useEffect, useState } from 'react';
import { supabase, type Profile } from '@/lib/supabase';

export function useProfile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function fetchProfile() {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    if (mounted) setIsLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*, departments(slug)')
                    .eq('id', session.user.id)
                    .single();

                if (data && mounted) {
                    setProfile(data);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        fetchProfile();

        return () => {
            mounted = false;
        };
    }, []);

    return { profile, isLoading, isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin' };
}
