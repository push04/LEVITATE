/**
 * Full Pipeline Test: BizDev + Research Email Extraction
 * Tests both: businesses WITH websites (crawl), and WITHOUT (extractor)
 */

import { scrapeCombo } from './src/lib/scrapers/free-sources';

// ─── Simulates the Research Agent's website email crawler ─────────────────────
async function extractEmailFromWebsite(websiteUrl: string): Promise<string | null> {
  if (!websiteUrl) return null
  const base = websiteUrl.replace(/\/$/, '').replace(/^http:/, 'https:')
  const pagesToTry = [`${base}/contact`, `${base}/contact-us`, `${base}/about`, base]

  for (const url of pagesToTry) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
        signal: AbortSignal.timeout(5000)
      })
      if (!res.ok) continue
      const html = await res.text()
      const match = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
      if (!match) continue
      const email = match.find(e =>
        !e.match(/example|noreply|no-reply|support@sentry|@w3|@schema|@domain|\.png|\.jpg/i)
      )
      if (email) return email.toLowerCase().trim()
    } catch { /* try next */ }
  }
  return null
}

async function runFullPipelineTest() {
  const combos = [
    { city: 'Pune', category: 'dental clinic' },
    { city: 'Mumbai', category: 'hotel' },
    { city: 'Ahmedabad', category: 'cafe' },
    { city: 'Delhi', category: 'gym' },
    { city: 'Bangalore', category: 'salon' },
  ]

  console.log('\n=== FULL PIPELINE TEST: BIZDEV + RESEARCH EMAIL EXTRACTION ===\n')

  let totalLeads = 0
  let emailsFromScrape = 0
  let emailsFromCrawl = 0
  let hasWebsiteCount = 0
  let noWebsiteCount = 0

  for (let i = 0; i < combos.length; i++) {
    const { city, category } = combos[i]
    console.log(`\n[Test ${i + 1}/5] ${category} in ${city}`)
    console.log('─'.repeat(50))

    const leads = await scrapeCombo(city, category)
    const valid = leads.filter(l => l.business_name?.trim().length > 2)
    totalLeads += valid.length
    console.log(`  Scraped: ${valid.length} leads`)

    for (const lead of valid.slice(0, 4)) {
      let emailSource = ''

      // Track if email came directly from scraper
      if (lead.email) {
        emailsFromScrape++
        emailSource = `[FROM SCRAPER: ${lead.email}]`
      }

      // Track website availability
      if (lead.current_website || lead.has_website) {
        hasWebsiteCount++
        // Simulate Research Agent crawling the website for email
        if (!lead.email && lead.current_website) {
          const crawledEmail = await extractEmailFromWebsite(lead.current_website)
          if (crawledEmail) {
            emailsFromCrawl++
            emailSource = `[CRAWLED FROM WEBSITE: ${crawledEmail}]`
          }
        }
      } else {
        noWebsiteCount++
      }

      console.log(`  -> ${lead.business_name}`)
      if (lead.phone) console.log(`     Phone: ${lead.phone}`)
      if (lead.current_website) console.log(`     Website: ${lead.current_website}`)
      if (emailSource) console.log(`     Email: ${emailSource}`)
      console.log(`     Source: ${lead.source} | Has Website: ${lead.has_website}`)
    }

    // Rate limit between combos
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n' + '='.repeat(50))
  console.log('PIPELINE SUMMARY')
  console.log('='.repeat(50))
  console.log(`Total leads scraped : ${totalLeads}`)
  console.log(`Emails from scraper : ${emailsFromScrape} (extracted directly from listing pages)`)
  console.log(`Emails from crawl   : ${emailsFromCrawl} (Research Agent crawled their website)`)
  console.log(`Leads with website  : ${hasWebsiteCount} (Research Agent will crawl for email)`)
  console.log(`Leads without site  : ${noWebsiteCount} (AI will deduce probable email)`)
  console.log('='.repeat(50))
  console.log('\nAll leads will eventually get an email via:')
  console.log('  1. Direct scrape (from listing page)')
  console.log('  2. Research Agent website crawl (/contact, /about pages)')
  console.log('  3. AI email deduction (AI guesses likely Gmail/business email)')
}

runFullPipelineTest().catch(console.error)
