import { generateAIResponse, FREE_MODELS } from './openrouter';

export interface AIFilterItem {
    id: string;
    text: string; // Combined title + description/snippet
}

export interface AIFilterResult {
    id: string;
    isLead: boolean;
    confidence: number;
    reason: string;
}

export async function filterItemsWithAI(items: AIFilterItem[], type: 'job' | 'social'): Promise<AIFilterResult[]> {
    if (items.length === 0) return [];

    const BATCH_SIZE = 15;
    const results: AIFilterResult[] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const batchResults = await processBatch(batch, type);
        results.push(...batchResults);
    }

    return results;
}

async function processBatch(items: AIFilterItem[], type: 'job' | 'social'): Promise<AIFilterResult[]> {
    const prompt = `
    Role: Lead Relevance Filter.
    Task: Analyze the following items and classify them.
    
    Context:
    - We are looking for:
      1. HIRING: Companies/Individuals looking to hire developers/agencies.
      2. PROJECTS: Freelance projects or contract work available.
      3. CLIENTS: People explicitly asking for help/services we can provide.
    
    - We MUST REJECT (Label as 'Noise'):
      1. NEWS: Tech news, release notes, articles.
      2. TUTORIALS: "How to", guides, courses.
      3. DISCUSSIONS: General questions, "What do you think", "Show HN".
      4. FOR HIRE: People LOOKING for work (unless they are also hiring).
    
    Items to Analyze:
    ${JSON.stringify(items.map(item => ({ id: item.id, text: item.text.substring(0, 300) })))}

    Output JSON ONLY:
    [
        { "id": "item_id", "isLead": true/false, "confidence": 0-100, "reason": "Short reason" }
    ]
    `;

    try {
        const response = await generateAIResponse([
            { role: 'system', content: 'You are a professional data analyst. Output valid JSON arrays only.' },
            { role: 'user', content: prompt }
        ], FREE_MODELS.GEMINI_FLASH_2);

        if (!response || response.includes('Failed to generate response')) throw new Error('No AI response');

        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const match = cleanJson.match(/\[[\s\S]*\]/);
        const jsonStr = match ? match[0] : cleanJson;

        const parsed = JSON.parse(jsonStr);
        return parsed;

    } catch (error) {
        console.error('AI Filter Error:', error);
        // Fallback: If AI fails, keep everything as leads but with low confidence
        return items.map(item => ({ id: item.id, isLead: true, confidence: 10, reason: 'AI Failed, Fallback' }));
    }
}
