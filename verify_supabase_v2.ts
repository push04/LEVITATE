
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('--- SUPABASE DEBUG START ---');

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials!');
    process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const publicClient = createClient(supabaseUrl, anonKey);

async function testSupabase() {
    // 1. Try to fetch existing leads as Admin
    console.log('\n1. Fetching leads as ADMIN (Service Role)...');
    const { data: leads, error: fetchError } = await adminClient
        .from('leads')
        .select('*');

    if (fetchError) {
        console.error('FAIL: Admin fetch error:', fetchError.message);
    } else {
        console.log(`SUCCESS: Found ${leads?.length} leads.`);
        if (leads && leads.length > 0) console.log('Sample:', leads[0].email);
    }

    // 2. Try to insert a test lead as Public (Anon)
    console.log('\n2. Inserting test lead as PUBLIC (Anon)...');
    const testLead = {
        name: 'Test Lead',
        email: `test-${Date.now()}@example.com`,
        service_category: 'web',
        budget: 'under-5k',
        message: 'This is a test lead from debugging script.',
        status: 'New'
    };

    const { data: inserted, error: insertError } = await publicClient
        .from('leads')
        .insert([testLead])
        .select();

    if (insertError) {
        console.error('FAIL: Public insert error:', insertError.message);
        // Check if RLS is the cause
        if (insertError.message.includes('policy')) {
            console.error('RLS POLICY VIOLATION');
        }
    } else {
        console.log('SUCCESS: Lead inserted.', inserted[0].id);
    }

    console.log('\n--- SUPABASE DEBUG END ---');
}

testSupabase();
