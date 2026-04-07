/**
 * Architect Agent Script — runs in GitHub Actions
 * Reads project from Supabase, designs architecture, outputs to env
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

async function callAI(system, user) {
  const gemmaUrl = process.env.GEMMA_API_URL
  const groqKey = process.env.GROQ_API_KEY

  // Try Gemma 4 on Kaggle first
  if (gemmaUrl) {
    try {
      const res = await fetch(`${gemmaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gemma-4', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 2000 }),
        signal: AbortSignal.timeout(60000)
      })
      if (res.ok) {
        const data = await res.json()
        return data.choices?.[0]?.message?.content ?? ''
      }
    } catch (e) { console.log('Gemma unavailable, trying Groq...') }
  }

  // Fallback to Groq (free)
  if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 2000 })
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  throw new Error('No AI provider available')
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const projectId = process.env.PROJECT_ID

  if (!projectId) throw new Error('PROJECT_ID not set')

  const { data: project } = await supabase.from('projects').select('*, clients(*)').eq('id', projectId).single()
  if (!project) throw new Error(`Project ${projectId} not found`)

  console.log(`[Architect] Designing architecture for: ${project.name}`)

  const arch = await callAI(
    `You are an expert web architect. Design a complete Next.js 14 website architecture.
Return ONLY valid JSON with this structure:
{
  "pages": [{"name": "home", "route": "/", "components": ["Hero", "Services", "Contact"]}],
  "components": ["Hero", "Navbar", "Footer"],
  "apis": [{"route": "/api/contact", "method": "POST", "purpose": "Contact form submission"}],
  "features": ["mobile_responsive", "contact_form", "whatsapp_button"],
  "database": null,
  "external_apis": [],
  "color_scheme": {"primary": "#1a1a2e", "accent": "#4f9cf9"},
  "font": "Inter"
}`,
    JSON.stringify({
      project_name: project.name,
      project_type: project.type,
      requirements: project.requirements,
      client_business: project.clients?.business_name,
      client_category: project.clients?.business_type
    })
  )

  let architecture
  try {
    const clean = arch.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    architecture = JSON.parse(clean)
  } catch {
    architecture = { pages: [{ name: 'home', route: '/', components: ['Hero'] }], components: ['Hero', 'Navbar', 'Footer'], features: ['mobile_responsive'] }
  }

  // Save architecture to project
  await supabase.from('projects').update({
    architecture,
    status: 'architected',
    current_agent: 'coder'
  }).eq('id', projectId)

  // Set GitHub Actions outputs
  const outputFile = process.env.GITHUB_OUTPUT
  if (outputFile) {
    fs.appendFileSync(outputFile, `project_id=${projectId}\n`)
    fs.appendFileSync(outputFile, `project_name=${project.name}\n`)
    fs.appendFileSync(outputFile, `tech_stack=nextjs\n`)
  }

  await supabase.from('agent_logs').insert({
    agent_name: 'architect',
    action: 'design_architecture',
    project_id: projectId,
    input: { project_type: project.type },
    output: { pages: architecture.pages?.length, components: architecture.components?.length },
    status: 'success',
    credits_earned: 20
  })

  console.log(`[Architect] Architecture designed. Pages: ${architecture.pages?.length}, Components: ${architecture.components?.length}`)
}

main().catch(err => {
  console.error('[Architect] FAILED:', err)
  process.exit(1)
})
