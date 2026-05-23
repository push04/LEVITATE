const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            // Handle backgrounds
            content = content.replace(/bg-\[#0C0C0B\](?!\s*dark:)/g, 'bg-[#F2EFE9] dark:bg-[#0C0C0B]');
            content = content.replace(/bg-\[#F2EFE9\](?!\s*dark:)/g, 'bg-[#0C0C0B] dark:bg-[#F2EFE9]');
            
            // Handle backgrounds with opacity
            content = content.replace(/bg-\[#0C0C0B\]\/(\d+)(?!\s*dark:)/g, 'bg-[#F2EFE9]/$1 dark:bg-[#0C0C0B]/$1');
            content = content.replace(/bg-\[#F2EFE9\]\/(\d+)(?!\s*dark:)/g, 'bg-[#0C0C0B]/$1 dark:bg-[#F2EFE9]/$1');

            // Handle text
            content = content.replace(/text-\[#F2EFE9\](?!\s*dark:)/g, 'text-[#0C0C0B] dark:text-[#F2EFE9]');
            content = content.replace(/text-\[#0C0C0B\](?!\s*dark:)/g, 'text-[#F2EFE9] dark:text-[#0C0C0B]');
            
            // Handle text with opacity
            content = content.replace(/text-\[#F2EFE9\]\/(\d+)(?!\s*dark:)/g, 'text-[#0C0C0B]/$1 dark:text-[#F2EFE9]/$1');
            content = content.replace(/text-\[#0C0C0B\]\/(\d+)(?!\s*dark:)/g, 'text-[#F2EFE9]/$1 dark:text-[#0C0C0B]/$1');

            // Handle borders
            content = content.replace(/border-\[#F2EFE9\](?!\s*dark:)/g, 'border-[#0C0C0B] dark:border-[#F2EFE9]');
            content = content.replace(/border-\[#0C0C0B\](?!\s*dark:)/g, 'border-[#F2EFE9] dark:border-[#0C0C0B]');
            
            // Handle borders with opacity
            content = content.replace(/border-\[#F2EFE9\]\/(\d+)(?!\s*dark:)/g, 'border-[#0C0C0B]/$1 dark:border-[#F2EFE9]/$1');
            content = content.replace(/border-\[#0C0C0B\]\/(\d+)(?!\s*dark:)/g, 'border-[#F2EFE9]/$1 dark:border-[#0C0C0B]/$1');

            // Handle stroke
            content = content.replace(/stroke-\[#F2EFE9\](?!\s*dark:)/g, 'stroke-[#0C0C0B] dark:stroke-[#F2EFE9]');
            content = content.replace(/stroke-\[#0C0C0B\](?!\s*dark:)/g, 'stroke-[#F2EFE9] dark:stroke-[#0C0C0B]');

            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated: ' + fullPath);
            }
        }
    }
}

// Ensure html element doesn't force dark mode exclusively 
// (unless next-themes is installed, in which case we remove 'className="dark"')
let layoutPath = 'src/app/layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');
layoutContent = layoutContent.replace(/<html lang="en" suppressHydrationWarning className="dark">/, '<html lang="en" suppressHydrationWarning>');
// Fix body background in layout
layoutContent = layoutContent.replace(/bg-\[#0C0C0B\] text-\[#F2EFE9\]/, 'bg-[#F2EFE9] text-[#0C0C0B] dark:bg-[#0C0C0B] dark:text-[#F2EFE9]');
fs.writeFileSync(layoutPath, layoutContent);

processDir('src/components');
processDir('src/app');
