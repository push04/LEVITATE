/**
 * Levitate Lead Scraper — Full Source Health Test
 * Run: npx tsx scripts/test-scraper.ts
 *
 * Tests every source individually + combined scrapeLeads.
 * Reports: yield, phone/email/website hit rate, latency, bot-block status.
 */

import {
  fetchOverpassLeads,
  fetchNominatimLeads,
  fetchBingLeads,
  fetchDDGLeads,
  fetchJustDialLeads,
  fetchSulekhaLeads,
  fetchZomatoLeads,
  fetchPractoLeads,
  scrapeLeads,
  type ScrapedLead,
} from '../src/lib/scrapers/free-sources'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Test matrix ───────────────────────────────────────────────────────────────
// One general + one food + one health so Zomato/Practo actually fire
const CITY     = 'Vadodara'
const CAT_GEN  = 'salon'
const CAT_FOOD = 'restaurant'
const CAT_MED  = 'dental clinic'
const LIMIT    = 10

const CYAN  = '\x1b[36m'
const GREEN = '\x1b[32m'
const RED   = '\x1b[31m'
const YELLOW= '\x1b[33m'
const DIM   = '\x1b[2m'
const BOLD  = '\x1b[1m'
const RESET = '\x1b[0m'

function fmt(leads: ScrapedLead[], ms: number): string {
  if (leads.length === 0) return `${RED}✗ BLOCKED/EMPTY${RESET}  ${DIM}${ms}ms${RESET}`
  const phones  = leads.filter(l => l.phone).length
  const emails  = leads.filter(l => l.email).length
  const sites   = leads.filter(l => l.website).length
  const flag = leads.length >= 5 ? `${GREEN}✓` : `${YELLOW}⚠`
  return `${flag} ${leads.length} leads${RESET}  📞${phones}  ✉${emails}  🌐${sites}  ${DIM}${ms}ms${RESET}`
}

function sampleLine(leads: ScrapedLead[]): string {
  if (!leads.length) return ''
  const l = leads[0]
  const parts = [
    `"${l.business_name}"`,
    l.phone   ? `📞 ${l.phone}`   : '',
    l.email   ? `✉ ${l.email}`    : '',
    l.website ? `🌐 ${l.website.slice(0, 50)}` : '',
    `score=${l.ai_score}`,
  ].filter(Boolean)
  return `  ${DIM}Sample: ${parts.join('  ')}${RESET}`
}

async function run<T>(label: string, fn: () => Promise<T[]>): Promise<{ leads: T[], ms: number }> {
  const t = Date.now()
  let leads: T[] = []
  try { leads = await fn() } catch (e) { console.error(`  ${RED}Error: ${e}${RESET}`) }
  return { leads, ms: Date.now() - t }
}

async function main() {
  console.log(`\n${BOLD}${'═'.repeat(62)}`)
  console.log('  LEVITATE LEAD SCRAPER — SOURCE HEALTH REPORT')
  console.log(`${'═'.repeat(62)}${RESET}`)
  console.log(`${DIM}  City: ${CITY}  |  General: ${CAT_GEN}  |  Food: ${CAT_FOOD}  |  Health: ${CAT_MED}${RESET}\n`)

  const results: Record<string, { leads: ScrapedLead[], ms: number }> = {}

  // ── Individual source tests ───────────────────────────────────────────────
  console.log(`${CYAN}${BOLD}── Individual sources (general: "${CAT_GEN}") ──────────────${RESET}`)

  const sources: Array<{ key: string; label: string; fn: () => Promise<ScrapedLead[]> }> = [
    { key: 'overpass',  label: 'Overpass (OSM)',    fn: () => fetchOverpassLeads(CITY, CAT_GEN, LIMIT) },
    { key: 'nominatim', label: 'Nominatim',         fn: () => fetchNominatimLeads(CITY, CAT_GEN, LIMIT) },
    { key: 'bing',      label: 'Bing Web Search',   fn: () => fetchBingLeads(CITY, CAT_GEN, LIMIT) },
    { key: 'ddg',       label: 'DuckDuckGo',        fn: () => fetchDDGLeads(CITY, CAT_GEN, LIMIT) },
    { key: 'justdial',  label: 'JustDial',          fn: () => fetchJustDialLeads(CITY, CAT_GEN, LIMIT) },
    { key: 'sulekha',   label: 'Sulekha',           fn: () => fetchSulekhaLeads(CITY, CAT_GEN, LIMIT) },
  ]

  for (const s of sources) {
    process.stdout.write(`  ${s.label.padEnd(20)} → `)
    const r = await run(s.label, s.fn)
    results[s.key] = r as { leads: ScrapedLead[], ms: number }
    console.log(fmt(r.leads as ScrapedLead[], r.ms))
    if (r.leads.length) console.log(sampleLine(r.leads as ScrapedLead[]))
  }

  // Zomato (food only)
  console.log()
  process.stdout.write(`  ${'Zomato (food)'.padEnd(20)} → `)
  const zomato = await run('zomato', () => fetchZomatoLeads(CITY, CAT_FOOD, LIMIT))
  results['zomato'] = zomato as { leads: ScrapedLead[], ms: number }
  console.log(fmt(zomato.leads as ScrapedLead[], zomato.ms))
  if (zomato.leads.length) console.log(sampleLine(zomato.leads as ScrapedLead[]))

  // Practo (health only)
  process.stdout.write(`  ${'Practo (health)'.padEnd(20)} → `)
  const practo = await run('practo', () => fetchPractoLeads(CITY, CAT_MED, LIMIT))
  results['practo'] = practo as { leads: ScrapedLead[], ms: number }
  console.log(fmt(practo.leads as ScrapedLead[], practo.ms))
  if (practo.leads.length) console.log(sampleLine(practo.leads as ScrapedLead[]))

  // ── Rate-limit re-check (immediate second call) ───────────────────────────
  console.log(`\n${CYAN}${BOLD}── Rate-limit re-check (immediate 2nd request) ──────────${RESET}`)
  console.log(`${DIM}  Testing if sources block/degrade on a back-to-back call...${RESET}`)

  const rtSources = ['bing', 'justdial', 'sulekha'] as const
  for (const key of rtSources) {
    const src = sources.find(s => s.key === key)!
    process.stdout.write(`  ${src.label.padEnd(20)} → `)
    const r2 = await run(src.label, src.fn)
    const first = results[key].leads.length
    const second = (r2.leads as ScrapedLead[]).length
    const status = second === 0 && first > 0
      ? `${RED}✗ RATE LIMITED${RESET} (got ${first} first, 0 second)`
      : second < first / 2 && first > 0
      ? `${YELLOW}⚠ DEGRADED${RESET} (${first} → ${second})`
      : `${GREEN}✓ OK${RESET} (${first} → ${second})`
    console.log(`${status}  ${DIM}${r2.ms}ms${RESET}`)
  }

  // ── Combined scrapeLeads ──────────────────────────────────────────────────
  console.log(`\n${CYAN}${BOLD}── Combined scrapeLeads (limit=25) ──────────────────────${RESET}`)

  const combos = [
    { label: `${CITY} / ${CAT_GEN}`,  city: CITY, cat: CAT_GEN  },
    { label: `${CITY} / ${CAT_FOOD}`, city: CITY, cat: CAT_FOOD },
    { label: `${CITY} / ${CAT_MED}`,  city: CITY, cat: CAT_MED  },
    { label: `Mumbai / restaurant`,   city: 'Mumbai', cat: 'restaurant' },
    { label: `Delhi / plumber`,       city: 'Delhi',  cat: 'plumber'    },
  ]

  let totalLeads = 0
  let totalPhone = 0
  let totalEmail = 0
  let totalSite  = 0
  const allSources: Record<string, number> = {}

  for (const { label, city, cat } of combos) {
    await sleep(1200) // 1.2s between combos — Nominatim enforces 1 req/sec policy
    process.stdout.write(`  ${label.padEnd(28)} → `)
    const t = Date.now()
    let leads: ScrapedLead[] = []
    try { leads = await scrapeLeads(city, cat, 25) } catch {}
    const ms = Date.now() - t

    const bySource: Record<string, number> = {}
    for (const l of leads) {
      const s = String(l.raw_data?.source ?? 'unknown')
      bySource[s] = (bySource[s] ?? 0) + 1
      allSources[s] = (allSources[s] ?? 0) + 1
    }

    console.log(fmt(leads, ms))
    if (leads.length) {
      console.log(`  ${DIM}Sources: ${JSON.stringify(bySource)}${RESET}`)
      console.log(sampleLine(leads))
    }

    totalLeads += leads.length
    totalPhone += leads.filter(l => l.phone).length
    totalEmail += leads.filter(l => l.email).length
    totalSite  += leads.filter(l => l.website).length
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${'═'.repeat(62)}`)
  console.log('  SUMMARY')
  console.log(`${'═'.repeat(62)}${RESET}`)

  const working = sources.filter(s => results[s.key].leads.length > 0).map(s => s.label)
  const blocked = sources.filter(s => results[s.key].leads.length === 0).map(s => s.label)
  if (results['zomato'].leads.length > 0) working.push('Zomato')
  else blocked.push('Zomato')
  if (results['practo'].leads.length > 0) working.push('Practo')
  else blocked.push('Practo')

  console.log(`\n  ${GREEN}Working:${RESET} ${working.join(', ') || 'none'}`)
  if (blocked.length) console.log(`  ${RED}Blocked/Empty:${RESET} ${blocked.join(', ')}`)

  console.log(`\n  Combined scrapeLeads totals (${combos.length} combos × 25 limit):`)
  const avg = (totalLeads / combos.length).toFixed(1)
  console.log(`  Leads:   ${BOLD}${totalLeads}${RESET} total  (${avg} avg per run)`)
  console.log(`  Phone:   ${totalPhone}/${totalLeads} (${totalLeads ? Math.round(totalPhone/totalLeads*100) : 0}%)`)
  console.log(`  Email:   ${totalEmail}/${totalLeads} (${totalLeads ? Math.round(totalEmail/totalLeads*100) : 0}%)`)
  console.log(`  Website: ${totalSite}/${totalLeads} (${totalLeads ? Math.round(totalSite/totalLeads*100) : 0}%)`)
  console.log(`  Sources: ${DIM}${JSON.stringify(allSources)}${RESET}`)

  // Verdict
  const avgNum = parseFloat(avg)
  console.log()
  if (avgNum >= 15) {
    console.log(`  ${GREEN}${BOLD}VERDICT: GOOD — averaging ${avg} leads/run${RESET}`)
  } else if (avgNum >= 8) {
    console.log(`  ${YELLOW}${BOLD}VERDICT: OK — averaging ${avg} leads/run (some sources may be blocked)${RESET}`)
  } else {
    console.log(`  ${RED}${BOLD}VERDICT: LOW — averaging ${avg} leads/run, check blocked sources${RESET}`)
  }
  console.log(`${'═'.repeat(62)}\n`)
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
