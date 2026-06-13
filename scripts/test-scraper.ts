/**
 * Scraper verification test
 * Run: npx tsx scripts/test-scraper.ts
 * Tests scrapeLeads across multiple city+category combos and reports per-source yield.
 */

import { scrapeLeads } from '../src/lib/scrapers/free-sources'

const TEST_CASES = [
  // Food — Zomato + Sulekha + Bing + Nominatim
  { city: 'Mumbai',     category: 'restaurant' },
  // Health — Practo + Sulekha + Bing
  { city: 'Bangalore',  category: 'dental clinic' },
  // General home service
  { city: 'Delhi',      category: 'plumber' },
  // Professional services
  { city: 'Pune',       category: 'chartered accountant' },
  // Tier-2 city, education
  { city: 'Jaipur',     category: 'coaching centre' },
  // Tier-2 city, general
  { city: 'Chandigarh', category: 'gym' },
  // Tier-3 city — stress test sparsity
  { city: 'Agra',       category: 'event planner' },
  // Health — pharmacy Practo
  { city: 'Hyderabad',  category: 'pharmacy' },
]

async function test() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  LEVITATE LEAD SCRAPER — VERIFICATION TEST')
  console.log('═══════════════════════════════════════════════════\n')

  let totalLeads = 0
  let totalWithPhone = 0
  let totalWithEmail = 0
  let totalWithWebsite = 0
  const globalSources: Record<string, number> = {}

  for (const { city, category } of TEST_CASES) {
    console.log(`▶ ${city} / ${category}`)
    const start = Date.now()

    const leads = await scrapeLeads(city, category, 10)
    const elapsed = Date.now() - start

    const bySource: Record<string, number> = {}
    const withPhone   = leads.filter(l => l.phone).length
    const withEmail   = leads.filter(l => l.email).length
    const withWebsite = leads.filter(l => l.website).length

    for (const l of leads) {
      const src = String(l.raw_data?.source ?? 'unknown')
      bySource[src] = (bySource[src] ?? 0) + 1
      globalSources[src] = (globalSources[src] ?? 0) + 1
    }

    const status = leads.length === 0 ? '✗ ZERO LEADS' : leads.length < 3 ? '⚠ LOW' : '✓'
    console.log(`  ${status}  ${leads.length} leads  ${elapsed}ms`)
    console.log(`  Sources:  ${JSON.stringify(bySource)}`)
    console.log(`  Phone: ${withPhone}  Email: ${withEmail}  Website: ${withWebsite}`)

    if (leads.length > 0) {
      const sample = leads[0]
      console.log(`  Sample:   "${sample.business_name}" | phone=${sample.phone ?? '—'} | src=${sample.raw_data?.source}`)
    }
    console.log()

    totalLeads     += leads.length
    totalWithPhone += withPhone
    totalWithEmail += withEmail
    totalWithWebsite += withWebsite
  }

  console.log('───────────────────────────────────────────────────')
  console.log('TOTALS across all test cases:')
  console.log(`  Leads:    ${totalLeads} (${(totalLeads / TEST_CASES.length).toFixed(1)} avg per combo)`)
  console.log(`  Phone:    ${totalWithPhone}/${totalLeads} (${totalLeads ? Math.round(totalWithPhone/totalLeads*100) : 0}%)`)
  console.log(`  Email:    ${totalWithEmail}/${totalLeads} (${totalLeads ? Math.round(totalWithEmail/totalLeads*100) : 0}%)`)
  console.log(`  Website:  ${totalWithWebsite}/${totalLeads} (${totalLeads ? Math.round(totalWithWebsite/totalLeads*100) : 0}%)`)
  console.log(`  Sources:  ${JSON.stringify(globalSources)}`)
  console.log('═══════════════════════════════════════════════════')
}

test().catch(err => { console.error('FATAL:', err); process.exit(1) })
