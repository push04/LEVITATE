const fs = require('fs');
let content = fs.readFileSync('src/data/services.ts', 'utf8');

content = content.replace(/longDescription: `([\s\S]*?)`,(\n\s*features:)/g, (match, p1, p2) => {
    let clean = p1.replace(/###.*?\n/g, '').replace(/\*\*/g, '').trim();
    let paras = clean.split('\n').map(p => p.trim()).filter(p => p.length > 0 && !p.startsWith('-'));
    let p_out = paras[0];
    if (paras.length > 1) p_out += '\n\n        ' + paras[1];
    return 'longDescription: `' + p_out + '`,' + p2;
});

fs.writeFileSync('src/data/services.ts', content);
