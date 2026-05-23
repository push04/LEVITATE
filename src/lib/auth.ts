import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env'
import { getServiceSupabase } from '@/lib/supabase'
import { isAdminRole } from '@/lib/roles'

export async function checkAdminAuth(_request?: NextRequest): Promise<{ isAuthenticated: boolean }> {
    void _request

    const cookieStore = await cookies()

    const supabase = createServerClient(
        getSupabaseUrl(),
        getSupabasePublishableKey(),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll() {
                    // Route handlers only need read access here.
                }
            }
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { isAuthenticated: false }
    }

    const serviceSupabase = getServiceSupabase()
    const { data: profile, error } = await serviceSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (error || !profile) {
        return { isAuthenticated: false }
    }

    if (!isAdminRole(profile.role)) {
        return { isAuthenticated: false }
    }

    return { isAuthenticated: true }
}
