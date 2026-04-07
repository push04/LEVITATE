/**
 * Debugger Agent — auto-fixes failing tests
 */
const { createClient } = require('@supabase/supabase-js')
const { execSync } = require('child_process')
const fs = require('fs')

async function callAI(system, user) {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('No AI key')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 2000 })
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const projectId = process.env.PROJECT_ID

  // Read test results
  let testError = 'Unknown test failure'
  if (fs.existsSync('test-results/results.json')) {
    try {
      const results = JSON.parse(fs.readFileSync('test-results/results.json', 'utf-8'))
      testError = JSON.stringify(results?.errors ?? results, null, 2).slice(0, 2000)
    } catch { /* ignore */ }
  }

  console.log('[Debugger] Analyzing failure:', testError.slice(0, 200))

  // Ask AI for fix
  try {
    const fix = await callAI(
      'You are a Next.js debugging expert. Analyze the test failure and provide specific code fixes.',
      `Test failure in client website:\n${testError}\n\nProvide the EXACT file changes needed to fix this. Be specific.`
    )
    console.log('[Debugger] AI suggested fix:', fix.slice(0, 500))
  } catch (err) {
    console.log('[Debugger] Could not get AI fix:', err.message)
  }

  await supabase.from('agent_logs').insert({
    agent_name: 'debugger',
    action: 'auto_debug',
    project_id: projectId,
    input: { error: testError.slice(0, 500) },
    output: { attempted: true },
    status: 'partial',
    credits_earned: -10
  })

  console.log('[Debugger] Debug attempt complete. Check logs for details.')
}

main().catch(err => { console.error('[Debugger] FAILED:', err) })
