import fs from 'node:fs'
import path from 'node:path'

const ROOTS = ['src', 'public']
const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.md',
  '.json',
  '.txt',
  '.html',
  '.svg',
])

const EMOJI_REGEX = /\p{Extended_Pictographic}/gu
const EMOJI_IGNORE = new Set(['©', '®', '™'])
const patterns = [
  { name: 'raw [object Object]', regex: /\[object Object\]/g },
  // Common mojibake signals when UTF-8 is double-decoded or mis-decoded.
  { name: 'mojibake â', regex: /â[\u0000-\u007F]/g },
  { name: 'mojibake ð', regex: /ð[\u0000-\u007F]/g },
]

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.git')) continue
      walk(fullPath, files)
      continue
    }

    if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name))) continue
    files.push(fullPath)
  }
  return files
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const findings = []

  const emojiMatches = [...content.matchAll(EMOJI_REGEX)].filter((match) => !EMOJI_IGNORE.has(match[0]))
  if (emojiMatches.length) {
    const unique = [...new Set(emojiMatches.map((m) => m[0]))].join('')
    findings.push({ type: 'emoji', detail: unique })
  }

  for (const pattern of patterns) {
    if (pattern.regex.test(content)) {
      findings.push({ type: pattern.name, detail: 'found' })
    }
  }

  return findings
}

let hasFailures = false

for (const root of ROOTS) {
  const rootPath = path.join(process.cwd(), root)
  if (!fs.existsSync(rootPath)) continue

  const files = walk(rootPath)
  for (const filePath of files) {
    const findings = scanFile(filePath)
    if (!findings.length) continue

    hasFailures = true
    console.log(`\n${path.relative(process.cwd(), filePath)}`)
    for (const finding of findings) {
      console.log(`- ${finding.type}${finding.detail && finding.detail !== 'found' ? `: ${finding.detail}` : ''}`)
    }
  }
}

if (hasFailures) {
  console.error('\nUI regression scan failed.')
  process.exit(1)
}

console.log('UI regression scan passed.')
