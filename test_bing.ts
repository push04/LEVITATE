// Quick isolated Bing test — single request, fresh
async function test() {
  const q = `"Dr. Rohit Jethale" Pune dentist email contact`
  const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&cc=in&setlang=en`
  console.log('Fetching Bing...')
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-IN,en;q=0.9',
    },
    signal: AbortSignal.timeout(10000)
  })
  console.log('Status:', res.status)
  const html = await res.text()
  console.log('HTML length:', html.length)
  
  const emails = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
  console.log('Emails found:', emails?.length ?? 0)
  if (emails) {
    for (const e of emails) {
      const lower = e.toLowerCase()
      if (lower.match(/@bing|@microsoft|\.png|\.jpg|@w3|schema|noreply|error|gstatic|example/i)) continue
      console.log(' -> VALID:', lower)
    }
  }
}
test()
