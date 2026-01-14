import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role for admin operations
export const getServiceSupabase = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceRoleKey);
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
    raw_data: any;
    created_at: string;
}
