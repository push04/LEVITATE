/**
 * Coder Agent Script — runs in GitHub Actions
 * Uses Aider with Groq (free) to generate the website code
 */
const { createClient } = require('@supabase/supabase-js')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const projectId = process.env.PROJECT_ID

  const { data: project } = await supabase.from('projects').select('*, clients(*)').eq('id', projectId).single()
  if (!project) throw new Error(`Project ${projectId} not found`)

  const arch = project.architecture ?? {}
  const clientDir = './client-repo'

  // Create Next.js project if it doesn't exist
  if (!fs.existsSync(clientDir)) {
    console.log('[Coder] Creating Next.js project...')
    execSync(`npx create-next-app@latest ${clientDir} --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes`, { stdio: 'inherit' })
  }

  process.chdir(clientDir)

  // Write the coding instructions for Aider
  const instructions = `Create a professional ${project.type} website for ${project.clients?.business_name}.

Requirements:
${project.requirements ?? 'Standard business website'}

Pages to create: ${(arch.pages ?? []).map((p) => p.name).join(', ')}
Features: ${(arch.features ?? []).join(', ')}
Color scheme: ${JSON.stringify(arch.color_scheme ?? {})}

RULES:
- Every page must be COMPLETE — no placeholders, no TODOs
- Mobile-first responsive design
- Include a WhatsApp chat button (number: 919999999999)
- Contact form that sends email
- Professional, trust-building design
- Fast loading (no unnecessary dependencies)
- Include the business name "${project.clients?.business_name}" prominently
- City: ${project.clients?.city ?? 'Vadodara, Gujarat'}

Create all pages listed and make them production-ready.`

  fs.writeFileSync('CODING_TASK.md', instructions)

  // Run Aider with Groq (free, OpenAI-compatible)
  // OPENAI_API_BASE and OPENAI_API_KEY env vars are set in the workflow
  try {
    execSync(
      `aider --model openai/llama-3.3-70b-versatile --yes --no-git CODING_TASK.md`,
      { stdio: 'inherit', timeout: 1200000 } // 20 min timeout
    )
  } catch (err) {
    console.error('[Coder] Aider execution failed:', err.message)
    // Continue — partial output is better than nothing
  }

  // Update project status
  await supabase.from('projects').update({
    status: 'review',
    current_agent: 'reviewer'
  }).eq('id', projectId)

  await supabase.from('agent_logs').insert({
    agent_name: 'coder',
    action: 'generate_website',
    project_id: projectId,
    input: { project_type: project.type },
    output: { pages_created: arch.pages?.length },
    status: 'success',
    credits_earned: 30
  })

  console.log('[Coder] Website generated successfully')
}

main().catch(err => {
  console.error('[Coder] FAILED:', err)
  process.exit(1)
})
