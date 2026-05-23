// Test multiple search engine approaches for email discovery

async function tryBingSearch(businessName: string, city: string): Promise<string | undefined> {
  const q = `"${businessName}" ${city} email contact @gmail.com`
  const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&cc=in`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000)
    })
    console.log(`  [Bing] Status: ${res.status}, Length: ${(await res.clone().text()).length}`)
    if (!res.ok) return undefined
    const html = await res.text()
    
    const emailMatches = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
    if (emailMatches) {
      for (const raw of emailMatches) {
        const e = raw.toLowerCase()
        if (e.match(/\.png|\.jpg|\.gif|\.svg|\.webp|\.ico|example|noreply|no-reply|sentry|@w3|@schema|@bing|@microsoft|u00|u002|@wikipedia|placeholder|test@/i)) continue
        const parts = e.split('@')
        if (parts.length !== 2 || !parts[1].includes('.')) continue
        return e
      }
    }
  } catch (err) {
    console.log(`  [Bing] Error: ${err}`)
  }
  return undefined
}

async function tryGoogleSearch(businessName: string, city: string): Promise<string | undefined> {
  const q = `"${businessName}" ${city} email`
  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=en&gl=in`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000)
    })
    console.log(`  [Google] Status: ${res.status}, Length: ${(await res.clone().text()).length}`)
    if (!res.ok) return undefined
    const html = await res.text()
    
    const emailMatches = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
    if (emailMatches) {
      for (const raw of emailMatches) {
        const e = raw.toLowerCase()
        if (e.match(/\.png|\.jpg|\.gif|\.svg|\.webp|\.ico|example|noreply|no-reply|sentry|@w3|@schema|@google|u00|u002|@wikipedia|placeholder|test@|gstatic/i)) continue
        const parts = e.split('@')
        if (parts.length !== 2 || !parts[1].includes('.')) continue
        return e
      }
    }
  } catch (err) {
    console.log(`  [Google] Error: ${err}`)
  }
  return undefined
}

async function test() {
  const businesses = [
    { name: 'Dr. Rohit Jethale', city: 'Pune' },
    { name: 'Crush Coffee', city: 'Ahmedabad' },
    { name: 'Smile Invent Dental Clinic', city: 'Vadodara' },
  ]

  console.log('=== SEARCH ENGINE EMAIL DISCOVERY TEST ===\n')

  for (const biz of businesses) {
    console.log(`\nSearching: "${biz.name}" in ${biz.city}`)
    console.log('─'.repeat(40))
    
    const bingEmail = await tryBingSearch(biz.name, biz.city)
    if (bingEmail) console.log(`  BING FOUND: ${bingEmail}`)
    
    await new Promise(r => setTimeout(r, 2000))
    
    const googleEmail = await tryGoogleSearch(biz.name, biz.city)
    if (googleEmail) console.log(`  GOOGLE FOUND: ${googleEmail}`)
    
    await new Promise(r => setTimeout(r, 2000))
  }
  console.log('\n=== DONE ===')
}

test()
