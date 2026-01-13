
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key Length:', serviceRoleKey ? serviceRoleKey.length : 'MISSING');

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkLeads() {
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*');

    if (error) {
        console.error('Error fetching leads:', error);
    } else {
        console.log('Success! Found leads:', leads?.length);
        if (leads && leads.length > 0) {
            console.log('First lead:', leads[0]);
        } else {
            console.log('No leads found in database.');
        }
    }
}

checkLeads();
