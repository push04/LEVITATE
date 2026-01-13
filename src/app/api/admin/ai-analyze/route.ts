import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { generateAIResponse, SYSTEM_PROMPTS, FREE_MODELS, ChatMessage } from '@/lib/openrouter';

export async function POST(request: NextRequest) {
    try {
        const { leadId } = await request.json();

        if (!leadId) {
            return NextResponse.json(
                { success: false, error: 'Lead ID is required' },
                { status: 400 }
            );
        }

        const supabase = getServiceSupabase();

        // Fetch the lead
        const { data: lead, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error || !lead) {
            return NextResponse.json(
                { success: false, error: 'Lead not found' },
                { status: 404 }
            );
        }

        // Generate AI analysis
        const prompt = `Analyze this lead for Levitate Labs:
Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone || 'N/A'}
Service: ${lead.service_category}
Business Type: ${lead.business_type || 'N/A'}
City: ${lead.city || 'N/A'}
Website: ${lead.website_link || 'N/A'}
Budget: ${lead.budget || 'N/A'}
Message: ${lead.message || 'N/A'}
Notes: ${lead.notes || 'N/A'}
Source: ${lead.source || 'Web Form'}

Provide a brief analysis including:
1. Lead quality score (1-10)
2. Service fit assessment
3. Suggested next steps`;

        const messages: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPTS.LEAD_ANALYZER },
            { role: 'user', content: prompt },
        ];

        const response = await generateAIResponse(messages, FREE_MODELS.NEMOTRON);

        if (response.success) {
            return NextResponse.json({
                success: true,
                analysis: response.message,
            });
        } else {
            return NextResponse.json({
                success: false,
                error: response.error || 'Failed to generate analysis',
            });
        }
    } catch (error) {
        console.error('AI analysis error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
