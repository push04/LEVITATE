/**
 * Direct test of DuckDuckGo Email Discovery + Deep Website Crawler
 */

async function searchEmailViaDDG(businessName: string, city: string): Promise<string | undefined> {
  const queries = [
    `"${businessName}" ${city} email contact`,
    `"${businessName}" ${city} @gmail.com OR @yahoo.com OR @hotmail.com`,
  ]
  for (const q of queries) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(6000)
      })
      if (!res.ok) continue
      const html = await res.text()
      const emailMatches = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
      if (emailMatches) {
        for (const raw of emailMatches) {
          const e = raw.toLowerCase()
          if (e.match(/\.png|\.jpg|\.gif|\.svg|\.webp|\.ico|example|noreply|no-reply|sentry|@w3|@schema|@duckduckgo|@duck\.com|u00|u002|@wikipedia|@wikimedia|placeholder|test@/i)) continue
          const parts = e.split('@')
          if (parts.length !== 2) continue
          const domain = parts[1]
          if (!domain.includes('.') || domain.endsWith('.png') || domain.endsWith('.jpg')) continue
          return e
        }
      }
    } catch { }
  }
  return undefined
}

async function test() {
  const businesses = [
    { name: 'Smile Invent Dental Clinic', city: 'Vadodara' },
    { name: 'Swasthyam Physiotherapy Center', city: 'Vadodara' },
    { name: 'Crush Coffee', city: 'Ahmedabad' },
    { name: 'Dr. Ratnika Agarwal', city: 'Pune' },
    { name: 'Urban Thai Spa', city: 'Mumbai' },
  ]

  console.log('=== DUCKDUCKGO EMAIL DISCOVERY ENGINE TEST ===\n')

  for (const biz of businesses) {
    console.log(`Searching: "${biz.name}" in ${biz.city}...`)
    const email = await searchEmailViaDDG(biz.name, biz.city)
    if (email) {
      console.log(`  FOUND: ${email}`)
    } else {
      console.log(`  No email found via DDG`)
    }
    await new Promise(r => setTimeout(r, 1500)) // Rate limit
  }
  console.log('\n=== DONE ===')
}

test()
