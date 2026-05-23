const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error('Error: GOOGLE_API_KEY is not set in environment variables or .env.local');
    process.exit(1);
}
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log('Fetching models...');

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Writing to models_v2.json');
            fs.writeFileSync('models_v2.json', JSON.stringify(json, null, 2));
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            fs.writeFileSync('models_v2.json', JSON.stringify({ error: e.message, raw: data }, null, 2));
        }
    });

}).on('error', (err) => {
    console.error('Error:', err.message);
    fs.writeFileSync('models_v2.json', JSON.stringify({ error: err.message }, null, 2));
});
