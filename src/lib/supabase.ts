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
    status: 'New' | 'Contacted' | 'Closed';
    created_at: string;
}

export interface Service {
    id: string;
    category: string;
    name: string;
    price: string;
    description: string | null;
    updated_at: string;
}
