import { useEffect, useState } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import { isAdminRole, isBusinessRole, normalizeBusinessRole } from '@/lib/roles';

export function useProfile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const normalizedProfile = profile
        ? {
            ...profile,
            role: (normalizeBusinessRole(profile.role) ?? profile.role) as Profile['role'],
        }
        : null;

    useEffect(() => {
        let mounted = true;

        async function fetchProfile() {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    if (mounted) setIsLoading(false);
                    return;
                }

                const { data } = await supabase
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

    return {
        profile: normalizedProfile,
        isLoading,
        isAdmin: isAdminRole(profile?.role),
        isBusiness: isBusinessRole(profile?.role),
    };
}
