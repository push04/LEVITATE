/**
 * Create client repository in GitHub for the coding pipeline
 */
const { createClient } = require('@supabase/supabase-js')
const { execSync } = require('child_process')
const fs = require('fs')

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const projectId = process.env.PROJECT_ID

  const { data: project } = await supabase.from('projects').select('*, clients(business_name)').eq('id', projectId).single()
  const repoName = project?.slug ?? `client-${projectId?.slice(0, 8)}`

  // Initialize git repo for client code
  fs.mkdirSync('./client-repo', { recursive: true })
  process.chdir('./client-repo')
  execSync('git init', { stdio: 'inherit' })
  execSync(`git config user.email "agents@levitatelabs.online"`, { stdio: 'inherit' })
  execSync(`git config user.name "Levitate Labs Agent"`, { stdio: 'inherit' })

  // Create .gitignore
  fs.writeFileSync('.gitignore', 'node_modules\n.next\n.env\n.env.local\n')
  fs.writeFileSync('README.md', `# ${project?.name}\nBuilt by Levitate Labs · levitatelabs.online\n`)

  await supabase.from('projects').update({ github_repo: repoName }).eq('id', projectId)
  console.log(`[CreateRepo] Initialized client repo: ${repoName}`)
}

main().catch(err => { console.error('[CreateRepo] FAILED:', err); process.exit(1) })
