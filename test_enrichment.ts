/**
 * Tests scrapeCombo and shows BEFORE vs AFTER email enrichment
 */
import { scrapeCombo } from './src/lib/scrapers/free-sources';

async function test() {
  console.log('=== EMAIL ENRICHMENT: BEFORE vs AFTER ===\n')

  const leads = await scrapeCombo('Pune', 'dental clinic')

  console.log(`Total leads: ${leads.length}`)
  const withEmail = leads.filter(l => l.email)
  const withPhone = leads.filter(l => l.phone)
  const withWebsite = leads.filter(l => l.current_website)

  console.log(`With email  : ${withEmail.length}`)
  console.log(`With phone  : ${withPhone.length}`)
  console.log(`With website: ${withWebsite.length}`)
  console.log('')

  for (const lead of leads.slice(0, 8)) {
    console.log(`${lead.business_name}`)
    console.log(`  Source  : ${lead.source}`)
    if (lead.email)           console.log(`  Email   : ${lead.email}`)
    if (lead.phone)           console.log(`  Phone   : ${lead.phone}`)
    if (lead.current_website) console.log(`  Website : ${lead.current_website}`)
    if (!lead.email)          console.log(`  Email   : (none - will be deduced by AI agent)`)
    console.log('')
  }

  console.log('=== DONE ===')
}

test()
