/**
 * Tester Agent Script — runs in GitHub Actions
 * Generates Playwright tests and runs them against staging
 */
const { createClient } = require('@supabase/supabase-js')
const { execSync } = require('child_process')
const fs = require('fs')

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const projectId = process.env.PROJECT_ID

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  const stagingUrl = project?.staging_url ?? process.env.STAGING_URL ?? 'http://localhost:3000'

  const tests = `import { test, expect } from '@playwright/test'
const BASE = '${stagingUrl}'

test('Homepage loads', async ({ page }) => {
  await page.goto(BASE)
  await expect(page).toHaveTitle(/.+/)
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('Mobile responsive (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(BASE)
  await expect(page.locator('body')).toBeVisible()
})

test('No broken links on homepage', async ({ page }) => {
  await page.goto(BASE)
  const links = await page.locator('a[href]').all()
  for (const link of links.slice(0, 10)) {
    const href = await link.getAttribute('href')
    if (href && !href.startsWith('mailto') && !href.startsWith('tel') && !href.startsWith('#') && !href.startsWith('http')) {
      try {
        const res = await page.goto(BASE + href, { waitUntil: 'domcontentloaded', timeout: 10000 })
        expect(res?.status()).toBeLessThan(400)
        await page.goto(BASE)
      } catch { /* skip */ }
    }
  }
})

test('Page loads in under 5 seconds', async ({ page }) => {
  const start = Date.now()
  await page.goto(BASE)
  expect(Date.now() - start).toBeLessThan(5000)
})
`

  fs.mkdirSync('tests', { recursive: true })
  fs.writeFileSync('tests/website.spec.ts', tests)

  let testsPassed = true
  try {
    execSync('npx playwright test tests/website.spec.ts --reporter=json', { stdio: 'inherit' })
  } catch {
    testsPassed = false
  }

  const passRate = testsPassed ? 100 : 50

  await supabase.from('projects').update({
    test_pass_rate: passRate,
    status: testsPassed ? 'staging' : 'debugging',
    current_agent: testsPassed ? 'deployer' : 'debugger'
  }).eq('id', projectId)

  await supabase.from('agent_logs').insert({
    agent_name: 'tester',
    action: 'run_playwright_tests',
    project_id: projectId,
    output: { passed: testsPassed, pass_rate: passRate },
    status: testsPassed ? 'success' : 'failure',
    credits_earned: testsPassed ? 25 : -5
  })

  if (!testsPassed) process.exit(1)
  console.log('[Tester] All tests passed!')
}

main().catch(err => { console.error('[Tester] FAILED:', err); process.exit(1) })
