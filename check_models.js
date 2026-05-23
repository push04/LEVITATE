const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error('Error: GOOGLE_API_KEY is not set in environment variables or .env.local');
    process.exit(1);
}
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error('API Error:', json.error.message);
                fs.writeFileSync('available_models.txt', 'API Error: ' + json.error.message);
            } else if (json.models) {
                console.log('Available Models:');
                const modelsList = json.models.map(m => `- ${m.name} (${m.supportedGenerationMethods.join(', ')})`).join('\n');
                console.log(modelsList);
                fs.writeFileSync('available_models.txt', modelsList);
            } else {
                console.log('No models found or unexpected format:', json);
                fs.writeFileSync('available_models.txt', 'No models found: ' + JSON.stringify(json));
            }
        } catch (e) {
            console.error('Parse Error:', e.message);
            fs.writeFileSync('available_models.txt', 'Parse Error: ' + e.message + '\nRaw: ' + data);
        }
    });
}).on('error', e => {
    console.error('Request Error:', e.message);
    fs.writeFileSync('available_models.txt', 'Request Error: ' + e.message);
});
