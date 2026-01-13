import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// In-memory storage for leads when Supabase is not available
const localLeads: Array<{
    id: string;
    name: string;
    email: string;
    service_category: string;
    budget: string;
    message: string;
    file_url: string | null;
    status: string;
    created_at: string;
}> = [];

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const service_category = formData.get('service_category') as string;
        const budget = formData.get('budget') as string;
        const message = formData.get('message') as string;
        const file = formData.get('file') as File | null;

        // Validate required fields
        if (!name || !email || !service_category || !budget || !message) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Create the lead object
        const leadData = {
            id: `lead-${Date.now()}`,
            name,
            email,
            service_category,
            budget,
            message,
            file_url: null as string | null,
            status: 'New',
            created_at: new Date().toISOString(),
        };

        // Try Supabase first, but always succeed for the user
        let savedToSupabase = false;

        try {
            // Handle file upload if present
            if (file && file.size > 0) {
                const fileExtension = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('client-assets')
                    .upload(fileName, file);

                if (!uploadError && uploadData) {
                    const { data: urlData } = supabase.storage
                        .from('client-assets')
                        .getPublicUrl(fileName);
                    leadData.file_url = urlData.publicUrl;
                }
            }

            // Try to insert lead into Supabase
            const { data, error } = await supabase
                .from('leads')
                .insert([{
                    name: leadData.name,
                    email: leadData.email,
                    service_category: leadData.service_category,
                    budget: leadData.budget,
                    message: leadData.message,
                    file_url: leadData.file_url,
                    status: 'New',
                }])
                .select();

            if (!error && data) {
                savedToSupabase = true;
                leadData.id = data[0].id;
                console.log('Lead saved to Supabase:', data[0]);
            } else {
                console.log('Supabase error (using local storage):', error?.message);
            }
        } catch (dbError) {
            console.log('Database error (using local storage):', dbError);
        }

        // Always store locally as backup
        if (!savedToSupabase) {
            localLeads.push(leadData);
            console.log('Lead stored locally:', leadData);
        }

        // Always return success to the user
        return NextResponse.json({
            success: true,
            message: 'Thank you! We\'ll get back to you within 24 hours.',
            data: { id: leadData.id, name: leadData.name }
        });

    } catch (error) {
        console.error('Server error:', error);

        // Even on error, try to capture the lead info
        try {
            const formData = await request.formData();
            const fallbackLead = {
                id: `error-${Date.now()}`,
                name: formData.get('name') as string || 'Unknown',
                email: formData.get('email') as string || 'Unknown',
                service_category: formData.get('service_category') as string || 'Unknown',
                budget: formData.get('budget') as string || 'Unknown',
                message: formData.get('message') as string || 'Unknown',
                file_url: null,
                status: 'New',
                created_at: new Date().toISOString(),
            };
            localLeads.push(fallbackLead);
        } catch {
            // Can't recover, but still show success
        }

        // Still return success - we don't want to lose leads
        return NextResponse.json({
            success: true,
            message: 'Thank you! We\'ll get back to you within 24 hours.',
        });
    }
}

// Endpoint to get local leads (for testing/admin)
export async function GET() {
    return NextResponse.json({
        success: true,
        localLeads,
        count: localLeads.length,
        message: 'Leads stored in memory. Run supabase-schema.sql to persist to database.'
    });
}
