
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY;

const MODELS_TO_TEST = [
    'nvidia/nemotron-3-nano-30b-a3b:free', // Current
    'google/gemini-2.0-flash-exp:free', // Alternative 1
    'meta-llama/llama-3.2-11b-vision-instruct:free' // Alternative 2
];

async function testModel(model: string) {
    console.log(`\nTesting model: ${model}...`);
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://levitatelabs.com',
                'X-Title': 'Levitate Labs',
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'Hello, say "Working!"' }],
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`FAIL: ${response.status} - ${error}`);
            return false;
        }

        const data = await response.json();
        console.log('SUCCESS:', data.choices[0]?.message?.content);
        return true;
    } catch (error) {
        console.error('ERROR:', error);
        return false;
    }
}

async function runTests() {
    console.log('Checking API Key:', API_KEY ? 'Present' : 'MISSING');

    for (const model of MODELS_TO_TEST) {
        await testModel(model);
    }
}

runTests();
