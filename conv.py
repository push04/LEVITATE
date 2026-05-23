import os
import re

directories = ['src/components', 'src/app']

# Mappings of exact strings to replace
replacements = {
    'bg-[#0C0C0B]': 'bg-[#F2EFE9] dark:bg-[#0C0C0B]',
    'text-[#F2EFE9]': 'text-[#0C0C0B] dark:text-[#F2EFE9]',
    'text-[#F2EFE9]/60': 'text-[#0C0C0B]/60 dark:text-[#F2EFE9]/60',
    'text-[#F2EFE9]/40': 'text-[#0C0C0B]/40 dark:text-[#F2EFE9]/40',
    'border-[#F2EFE9]/20': 'border-[#0C0C0B]/20 dark:border-[#F2EFE9]/20',
    'border-[#F2EFE9]/40': 'border-[#0C0C0B]/40 dark:border-[#F2EFE9]/40',
    'border-[#F2EFE9]': 'border-[#0C0C0B] dark:border-[#F2EFE9]',
    'bg-[#F2EFE9]': 'bg-[#0C0C0B] dark:bg-[#F2EFE9]',
    'text-[#0C0C0B]': 'text-[#F2EFE9] dark:text-[#0C0C0B]'
}

for d in directories:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                original = content
                
                # Careful replacement to avoid double-replacing
                # We split by ' ' and replace exact words that match the tailwind class to avoid regex greediness.
                # Actually, tailwind classes can contain 'group-hover:text-[#F2EFE9]'.
                # Let's replace more specifically
                
                content = content.replace('bg-[#0C0C0B]', 'bg-[#F2EFE9] dark:bg-[#0C0C0B]')
                content = content.replace('text-[#F2EFE9]', 'text-[#0C0C0B] dark:text-[#F2EFE9]')
                content = content.replace('text-[#0C0C0B]', 'text-[#F2EFE9] dark:text-[#0C0C0B]')
                content = content.replace('bg-[#F2EFE9]', 'bg-[#0C0C0B] dark:bg-[#F2EFE9]')
                
                # Wait, if we replace text-[#F2EFE9] it also replaces text-[#F2EFE9]/60
                
                # Let's revert and do regex with whitespace boundaries.
                pass

