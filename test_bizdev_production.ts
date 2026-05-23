const SKIP_CLASSES = new Set(['highway','boundary','place','natural','waterway','landuse','railway','admin'])

async function scrapeNominatim(city: string, category: string) {
  const q   = `${category} ${city} India`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=25&extratags=1&countrycodes=in&addressdetails=0`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'LevitateLabsBot/1.0 (levitatelabs.online; bizdev research)',
        'Accept':          'application/json',
        'Accept-Language': 'en'
      },
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) return []

    const data = await res.json()
    const leads = []

    for (const item of data ?? []) {
      if (SKIP_CLASSES.has(item.class ?? '')) continue
      const name = (item.name || (item.display_name ?? '').split(',')[0]).trim()
      if (!name || name.length < 3) continue

      const ext     = item.extratags ?? {}
      const phone   = (ext['phone'] || ext['contact:phone'] || ext['mobile'] || '').replace(/[\s\-()]/g, '')
      const website = ext['website'] || ext['contact:website'] || ext['url'] || ''
      const email   = ext['email']   || ext['contact:email']   || ''

      leads.push({
        business_name: name,
        phone:       phone   || undefined,
        website:     website || undefined,
        source: 'BizDev Production Core Scanner'
      })
    }
    return leads
  } catch { return [] }
}

async function runLiveTest() {
  const tests = [
    { city: 'Mumbai', category: 'boutique' },
    { city: 'Pune', category: 'doctor' },
    { city: 'Delhi', category: 'dentist' },
    { city: 'Ahmedabad', category: 'cafe' },
    { city: 'Vadodara', category: 'restaurant' }
  ];

  console.log('--- STARTING 5 LIVE PRODUCTION BIZDEV SCANS ---');
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    console.log(`\n[Scan ${i + 1}/5] Real-time pinging ${t.category} in ${t.city}...`);
    
    // Scrape exactly like netlify/functions/bizdev.mts does
    const results = await scrapeNominatim(t.city, t.category);
    console.log(`✅ Fished ${results.length} authentic leads from the network.`);
    
    if (results.length > 0) {
        results.slice(0, 3).forEach((lead, idx) => {
           console.log(`   🔸 ${lead.business_name}`);
           if (lead.phone) console.log(`      Phone: ${lead.phone}`);
           if (lead.website) console.log(`      Website: ${lead.website}`);
        });
    } else {
        console.log(`   (No leads found in this specific sector)`);
    }
    
    // Sleep to prevent rate limit
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('\n--- LIVE TESTING COMPLETE ---');
}

runLiveTest();
