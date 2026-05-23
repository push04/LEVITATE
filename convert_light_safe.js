const fs = require('fs');
const path = require('path');

const classMap = {
    'bg-[#0C0C0B]': 'bg-[#F2EFE9] dark:bg-[#0C0C0B]',
    'bg-[#F2EFE9]': 'bg-[#0C0C0B] dark:bg-[#F2EFE9]',
    'text-[#F2EFE9]': 'text-[#0C0C0B] dark:text-[#F2EFE9]',
    'text-[#0C0C0B]': 'text-[#F2EFE9] dark:text-[#0C0C0B]',
    'border-[#F2EFE9]': 'border-[#0C0C0B] dark:border-[#F2EFE9]',
    'border-[#0C0C0B]': 'border-[#F2EFE9] dark:border-[#0C0C0B]',
    'stroke-[#F2EFE9]': 'stroke-[#0C0C0B] dark:stroke-[#F2EFE9]',
    'stroke-[#0C0C0B]': 'stroke-[#F2EFE9] dark:stroke-[#0C0C0B]',
    
    // Opacity variants
    'bg-[#0C0C0B]/80': 'bg-[#F2EFE9]/80 dark:bg-[#0C0C0B]/80',
    'text-[#F2EFE9]/60': 'text-[#0C0C0B]/60 dark:text-[#F2EFE9]/60',
    'text-[#F2EFE9]/50': 'text-[#0C0C0B]/50 dark:text-[#F2EFE9]/50',
    'text-[#F2EFE9]/40': 'text-[#0C0C0B]/40 dark:text-[#F2EFE9]/40',
    'text-[#F2EFE9]/70': 'text-[#0C0C0B]/70 dark:text-[#F2EFE9]/70',
    'text-[#F2EFE9]/80': 'text-[#0C0C0B]/80 dark:text-[#F2EFE9]/80',
    'border-[#F2EFE9]/5': 'border-[#0C0C0B]/5 dark:border-[#F2EFE9]/5',
    'border-[#F2EFE9]/10': 'border-[#0C0C0B]/10 dark:border-[#F2EFE9]/10',
    'border-[#F2EFE9]/20': 'border-[#0C0C0B]/20 dark:border-[#F2EFE9]/20',
    'border-[#F2EFE9]/40': 'border-[#0C0C0B]/40 dark:border-[#F2EFE9]/40',
    
    // Group hover
    'group-hover:text-[#F2EFE9]': 'group-hover:text-[#0C0C0B] dark:group-hover:text-[#F2EFE9]',
    'group-hover:text-[#0C0C0B]': 'group-hover:text-[#F2EFE9] dark:group-hover:text-[#0C0C0B]',
    'hover:text-[#C8A96E]': 'hover:text-[#C8A96E] dark:hover:text-[#C8A96E]', // leave alone
};

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            // Regex perfectly matches complete tailwind class tokens inside className=" ... ", or anything inside quotes.
            // We'll replace exact matches only if they match a key in classMap
            content = content.replace(/([a-zA-Z0-9\-\[\]#\/:]+)/g, (match) => {
                if (Object.hasOwn(classMap, match)) {
                    return classMap[match];
                }
                return match;
            });

            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated: ' + fullPath);
            }
        }
    }
}

let layoutPath = 'src/app/layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');
layoutContent = layoutContent.replace(/<html lang="en" suppressHydrationWarning className="dark">/, '<html lang="en" suppressHydrationWarning>');
// Also fix the layout body
layoutContent = layoutContent.replace(/bg-\[#0C0C0B\] text-\[#F2EFE9\]/, 'bg-[#F2EFE9] text-[#0C0C0B] dark:bg-[#0C0C0B] dark:text-[#F2EFE9]');
fs.writeFileSync(layoutPath, layoutContent);

processDir('src/components');
processDir('src/app');
