import { createBrowserClient } from '@supabase/ssr';
import { createClient as createClientJs } from '@supabase/supabase-js';

// Client-side singleton for browser usage (COOKIES)
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Function to create a fresh client if needed (e.g. inside components)
export const createClient = () => supabase;

// Server-side client with service role for admin operations (API Routes only)
export const getServiceSupabase = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
    return createClientJs(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
    );
};

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
    role: 'super_admin' | 'admin' | 'manager' | 'employee' | 'client';
    department_id?: string;
    job_title?: string;
    avatar_url?: string;
}
