
import { generateAIResponse, FREE_MODELS } from './src/lib/openrouter';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testChat() {
    console.log('Testing OpenRouter connection...');
    console.log('API Key present:', !!process.env.OPENROUTER_API_KEY);
    console.log('API Key start:', process.env.OPENROUTER_API_KEY?.substring(0, 10));

    const result = await generateAIResponse([
        { role: 'user', content: 'Say hello!' }
    ], FREE_MODELS.NEMOTRON);

    console.log('Result:', JSON.stringify(result, null, 2));
}

testChat();
