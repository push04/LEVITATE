// Quick debug: check what DDG actually returns
async function test() {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent('"Dr. Rohit Jethale" Pune email @gmail.com')}`
  console.log('Fetching:', url)
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(8000)
  })
  console.log('Status:', res.status)
  console.log('Content-Type:', res.headers.get('content-type'))
  const html = await res.text()
  console.log('HTML length:', html.length)
  
  // Check for emails in the raw HTML
  const emails = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
  console.log('Emails found:', emails?.length ?? 0)
  if (emails) {
    for (const e of emails.slice(0, 5)) {
      console.log(' ->', e)
    }
  }
  
  // Check if there's a captcha
  if (html.includes('captcha') || html.includes('CAPTCHA')) {
    console.log('CAPTCHA DETECTED!')
  }
  if (html.includes('result__snippet')) {
    console.log('Search results present (result__snippet found)')
  }
  if (html.includes('No results')) {
    console.log('NO RESULTS returned by DDG')
  }
  
  // Print a snippet of the HTML
  console.log('\n--- First 500 chars ---')
  console.log(html.substring(0, 500))
}
test()
