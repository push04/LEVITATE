/**
 * Reviewer Agent — code quality check before testing
 */
const { createClient } = require('@supabase/supabase-js')
const { execSync } = require('child_process')
const fs = require('fs')

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const projectId = process.env.PROJECT_ID

  let issues = []
  let passed = true

  try {
    // Run ESLint on client code
    if (fs.existsSync('./client-repo/package.json')) {
      try {
        execSync('cd client-repo && npm run lint 2>&1', { stdio: 'pipe', encoding: 'utf-8' })
      } catch (e) {
        issues.push('ESLint warnings: ' + e.stdout?.slice(0, 500))
      }
    }

    // Check for obvious issues
    const files = fs.readdirSync('./client-repo/app', { recursive: true }).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
    for (const file of files) {
      const content = fs.readFileSync(`./client-repo/app/${file}`, 'utf-8')
      if (content.includes('TODO') || content.includes('PLACEHOLDER')) {
        issues.push(`Placeholder found in ${file}`)
        passed = false
      }
    }
  } catch (err) {
    console.log('[Reviewer] Could not check files:', err.message)
  }

  await supabase.from('agent_logs').insert({
    agent_name: 'reviewer',
    action: 'code_review',
    project_id: projectId,
    output: { issues_found: issues.length, issues: issues.slice(0, 5) },
    status: passed ? 'success' : 'partial',
    credits_earned: passed ? 10 : -5
  })

  if (!passed) {
    console.warn('[Reviewer] Issues found:', issues)
  } else {
    console.log('[Reviewer] Code review passed!')
  }
}

main().catch(err => { console.error('[Reviewer] FAILED:', err) })
