import { createBrowserClient } from '@supabase/ssr';
import { createClient as createClientJs } from '@supabase/supabase-js';
import { getSupabasePublishableKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase-env';

// Lazy singleton - only created when first accessed, not at build time
let _supabase: ReturnType<typeof createBrowserClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
    get(_target, prop) {
        if (!_supabase) {
            _supabase = createBrowserClient(
                getSupabaseUrl(),
                getSupabasePublishableKey()
            )
        }
        const client = _supabase as unknown as Record<PropertyKey, unknown>
        const val = client[prop]
        return typeof val === 'function' ? val.bind(_supabase) : val
    }
})

// Function to create a fresh client if needed (e.g. inside components)
export const createClient = () => supabase

// Server-side client with service role for admin operations (API Routes only)
export const getServiceSupabase = () => {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    return createClientJs(
        getSupabaseUrl(),
        serviceRoleKey
    );
};
// Anon client for public-facing API routes — respects RLS
export const getAnonSupabase = () => createClientJs(
    getSupabaseUrl(),
    getSupabasePublishableKey()
);


// Types for database tables
export interface Lead {
    id: string;
    name: string;
    email: string;
    service_category: string;
    message: string | null;
    budget: string | null;
    file_url: string | null;
    status: 'New' | 'Contacted' | 'Follow Up' | 'Closed';
    created_at: string;
    // Manual Entry Fields
    phone?: string;
    business_type?: string;
    city?: string;
    google_map_link?: string;
    website_link?: string;
    is_followup?: boolean;
    notes?: string;
    deal_value?: number;
    source?: 'web_form' | 'manual_entry';
}

export interface Service {
    id: string;
    category: string;
    name: string;
    price: string;
    description: string | null;
    updated_at: string;
}

export interface PotentialLead {
    id: string;
    business_name: string;
    address?: string;
    phone?: string;
    website?: string;
    city: string;
    category: string;
    ai_score: number;
    status: 'pending' | 'approved' | 'rejected';
    raw_data: {
        text?: string;
        email?: string;
        tech_stack?: string;
        deep_scraped?: boolean;
    };
    created_at: string;
}

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: 'super_admin' | 'admin' | 'manager' | 'employee' | 'sales' | 'client' | 'company_admin' | 'business';
    department_id?: string;
    job_title?: string;
    avatar_url?: string;
}
