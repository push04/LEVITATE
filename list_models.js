const https = require('https');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error('Error: GOOGLE_API_KEY is not set in environment variables or .env.local');
    process.exit(1);
}
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

const fs = require('fs');

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error('Error:', json.error);
                fs.writeFileSync('models_list.txt', JSON.stringify(json.error, null, 2));
            } else {
                console.log('Writing models to file...');
                fs.writeFileSync('models_list.txt', JSON.stringify(json.models, null, 2));
            }
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            fs.writeFileSync('models_list.txt', 'Error parsing JSON: ' + e.message + '\nRaw Data: ' + data);
        }
    });

}).on('error', (err) => {
    console.error('Error:', err.message);
});
