/**
 * Deployer Agent — deploys client site to Netlify subdomain
 */
const { createClient } = require('@supabase/supabase-js')
const { execSync } = require('child_process')

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const projectId = process.env.PROJECT_ID
  const env = process.argv[2] ?? 'staging' // staging | production

  const { data: project } = await supabase.from('projects').select('*, clients(business_name)').eq('id', projectId).single()
  const siteName = project?.slug ?? `client-${projectId?.slice(0, 8)}`

  try {
    // Build the Next.js site
    execSync('npm run build', { cwd: './client-repo', stdio: 'inherit', timeout: 300000 })

    // Deploy to Netlify
    const deployCmd = env === 'production'
      ? `netlify deploy --prod --dir=./client-repo/out --site=${siteName}`
      : `netlify deploy --dir=./client-repo/out --site=${siteName} --alias=staging`

    const output = execSync(deployCmd, { stdio: 'pipe', encoding: 'utf-8' })
    const urlMatch = output.match(/https:\/\/[^\s]+netlify\.app/)
    const deployedUrl = urlMatch?.[0] ?? `https://${siteName}.netlify.app`

    // Update project with URL
    const updateData = env === 'production'
      ? { production_url: deployedUrl, status: 'delivered', delivered_at: new Date().toISOString() }
      : { staging_url: deployedUrl, status: 'staging' }

    await supabase.from('projects').update(updateData).eq('id', projectId)

    await supabase.from('agent_logs').insert({
      agent_name: 'deployer',
      action: `deploy_${env}`,
      project_id: projectId,
      output: { url: deployedUrl, env },
      status: 'success',
      credits_earned: env === 'production' ? 50 : 15
    })

    // Set output for next steps
    console.log(`::set-output name=staging_url::${deployedUrl}`)
    console.log(`[Deployer] Deployed to: ${deployedUrl}`)

    // Write URL to file for notify-client.js
    require('fs').writeFileSync('.deploy-url', deployedUrl)

  } catch (err) {
    console.error('[Deployer] Deploy failed:', err.message)
    await supabase.from('projects').update({ status: 'debugging', current_agent: 'debugger' }).eq('id', projectId)
    process.exit(1)
  }
}

main().catch(err => { console.error('[Deployer] FAILED:', err); process.exit(1) })
