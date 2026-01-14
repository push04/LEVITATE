
const apiKey = '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';
const model = 'allenai/molmo-2-8b:free';

async function testAI() {
    console.log(`Testing OpenRouter API with model: ${model}...`);
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://levitatelabs.com',
                'X-Title': 'Levitate Labs'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'Say "AI is Online" if you can read this.' }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log('--- API ERROR ---');
            console.log(`Status: ${response.status} ${response.statusText}`);
            console.log('Body:', errorText);
            console.log('-----------------');
            return;
        }

        const data = await response.json();
        console.log('Success!');
        console.log('Response:', data.choices[0].message.content);
    } catch (error) {
        console.error('Network/Script Error:', error);
    }
}

testAI();
