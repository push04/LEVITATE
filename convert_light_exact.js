const fs = require('fs');
const glob = require('fs').readdirSync;
const path = require('path');

const replacements = [
    ['bg-[#0C0C0B]', 'bg-[#F2EFE9] dark:bg-[#0C0C0B]'],
    ['bg-[#F2EFE9]', 'bg-[#0C0C0B] dark:bg-[#F2EFE9]'],
    ['text-[#F2EFE9]', 'text-[#0C0C0B] dark:text-[#F2EFE9]'],
    ['text-[#0C0C0B]', 'text-[#F2EFE9] dark:text-[#0C0C0B]'],
    ['border-[#F2EFE9]', 'border-[#0C0C0B] dark:border-[#F2EFE9]'],
    ['border-[#0C0C0B]', 'border-[#F2EFE9] dark:border-[#0C0C0B]'],
    ['stroke-[#F2EFE9]', 'stroke-[#0C0C0B] dark:stroke-[#F2EFE9]'],
    ['stroke-[#0C0C0B]', 'stroke-[#F2EFE9] dark:stroke-[#0C0C0B]'],
    // Opacity variants
    ['bg-[#0C0C0B]/80', 'bg-[#F2EFE9]/80 dark:bg-[#0C0C0B]/80'],
    ['text-[#F2EFE9]/60', 'text-[#0C0C0B]/60 dark:text-[#F2EFE9]/60'],
    ['text-[#F2EFE9]/50', 'text-[#0C0C0B]/50 dark:text-[#F2EFE9]/50'],
    ['text-[#F2EFE9]/40', 'text-[#0C0C0B]/40 dark:text-[#F2EFE9]/40'],
    ['text-[#F2EFE9]/70', 'text-[#0C0C0B]/70 dark:text-[#F2EFE9]/70'],
    ['text-[#F2EFE9]/80', 'text-[#0C0C0B]/80 dark:text-[#F2EFE9]/80'],
    ['border-[#F2EFE9]/5', 'border-[#0C0C0B]/5 dark:border-[#F2EFE9]/5'],
    ['border-[#F2EFE9]/10', 'border-[#0C0C0B]/10 dark:border-[#F2EFE9]/10'],
    ['border-[#F2EFE9]/20', 'border-[#0C0C0B]/20 dark:border-[#F2EFE9]/20'],
    ['border-[#F2EFE9]/40', 'border-[#0C0C0B]/40 dark:border-[#F2EFE9]/40']
];

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            // We must replace in decreasing order of length to avoid replacing the root strings first
            const orderedReplacements = [...replacements].sort((a, b) => b[0].length - a[0].length);

            for (const [search, replace] of orderedReplacements) {
                // Split and join to replace all occurrences literally without regex
                // But only if it's not already dark:bg-[#0C0C0B]
                // We can't easily avoid double-replace without regex if we run it multiple times, 
                // but since we just git reset, we only run it once.
                content = content.split(search).join(replace);
            }

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
layoutContent = layoutContent.replace(/bg-\[#0C0C0B\] text-\[#F2EFE9\]/, 'bg-[#F2EFE9] text-[#0C0C0B] dark:bg-[#0C0C0B] dark:text-[#F2EFE9]');
fs.writeFileSync(layoutPath, layoutContent);


processDir('src/components');
processDir('src/app');
