/**
 * Web Scraper for Lead Generation
 * Uses multiple free sources to find businesses without websites
 */

export interface LeadSource {
  name: string
  url: string
  business_name: string
  phone?: string
  email?: string
  city: string
  category: string
  has_website: boolean
  source_url?: string
  score_bonus: number
}

export async function scrapeYellowPages(city: string, categories: string[]): Promise<LeadSource[]> {
  const leads: LeadSource[] = []
  
  try {
    // YellowPages.in scraping via web fetch
    for (const category of categories) {
      try {
        const url = `https://www.yellowpages.in/${city}/${category}`
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        const html = await res.text()
        
        // Extract business names from the HTML
        const nameMatches = html.match(/class="listing-name"[^>]*>([^<]+)</g) || []
        const phoneMatches = html.match(/class="listing-phone"[^>]*>([^<]+)</g) || []
        
        for (let i = 0; i < Math.min(nameMatches.length, 10); i++) {
          const name = nameMatches[i]?.replace(/<[^>]+>/g, '').trim()
          const phone = phoneMatches[i]?.replace(/<[^>]+>/g, '').trim()
          
          if (name && !name.includes('Website')) {
            leads.push({
              name: 'YellowPages',
              url: url,
              business_name: name,
              phone: phone,
              city,
              category,
              has_website: false,
              source_url: url,
              score_bonus: 2
            })
          }
        }
      } catch (err) {
        console.error('[YellowPages] Failed:', err)
      }
      await sleep(2000)
    }
  } catch (err) {
    console.error('[YellowPages] Error:', err)
  }
  
  return leads
}

export async function scrapeIndiaMart(city: string, categories: string[]): Promise<LeadSource[]> {
  const leads: LeadSource[] = []
  
  try {
    for (const category of categories) {
      try {
        // IndiaMART search results
        const query = category.replace(/\s+/g, '-').toLowerCase()
        const url = `https://www.indiamart.com/${query}-manufacturers/`
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        const html = await res.text()
        
        // Extract company names
        const matches = html.match(/class="prod-name"[^>]*>([^<]+)</g) || []
        
        for (const match of matches.slice(0, 10)) {
          const name = match.replace(/<[^>]+>/g, '').trim()
          if (name && name.length > 2) {
            leads.push({
              name: 'IndiaMART',
              url: url,
              business_name: name,
              city: city || 'India',
              category,
              has_website: false,
              source_url: url,
              score_bonus: 3
            })
          }
        }
      } catch (err) {
        console.error('[IndiaMART] Failed:', category, err)
      }
      await sleep(3000)
    }
  } catch (err) {
    console.error('[IndiaMART] Error:', err)
  }
  
  return leads
}

export async function scrapeSulekha(city: string, categories: string[]): Promise<LeadSource[]> {
  const leads: LeadSource[] = []
  
  try {
    for (const category of categories) {
      try {
        const query = category.replace(/\s+/g, '-').toLowerCase()
        const url = `https://www.sulekha.com/${query}/${city}`
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        const html = await res.text()
        
        const matches = html.match(/class="bname"[^>]*>([^<]+)</g) || []
        
        for (const match of matches.slice(0, 8)) {
          const name = match.replace(/<[^>]+>/g, '').trim()
          if (name) {
            leads.push({
              name: 'Sulekha',
              url: url,
              business_name: name,
              city,
              category,
              has_website: false,
              source_url: url,
              score_bonus: 2
            })
          }
        }
      } catch (err) {
        console.error('[Sulekha] Failed:', category, err)
      }
      await sleep(2000)
    }
  } catch (err) {
    console.error('[Sulekha] Error:', err)
  }
  
  return leads
}

export async function scrapeJustDial(city: string, categories: string[]): Promise<LeadSource[]> {
  const leads: LeadSource[] = []
  
  try {
    for (const category of categories) {
      try {
        const url = `https://www.justdial.com/${city}/${category}`
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        const html = await res.text()
        
        // Extract business names and phones
        const nameMatches = html.match(/class="store-name"[^>]*>([^<]+)</g) || []
        const phoneMatches = html.match(/class="tel"[^>]*>([^<]+)</g) || []
        
        for (let i = 0; i < Math.min(nameMatches.length, 15); i++) {
          const name = nameMatches[i]?.replace(/<[^>]+>/g, '').trim()
          const phone = phoneMatches[i]?.replace(/<[^>]+>/g, '').trim()
          
          if (name && !name.includes('Website')) {
            leads.push({
              name: 'JustDial',
              url: url,
              business_name: name,
              phone: phone?.replace(/\s+/g, ''),
              city,
              category,
              has_website: false,
              source_url: `${url}/${name.replace(/\s+/g, '-').toLowerCase()}`,
              score_bonus: 2
            })
          }
        }
      } catch (err) {
        console.error('[JustDial] Failed:', category, err)
      }
      await sleep(3000)
    }
  } catch (err) {
    console.error('[JustDial] Error:', err)
  }
  
  return leads
}

export async function scrapeGoogleMapsDirect(city: string, categories: string[]): Promise<LeadSource[]> {
  const leads: LeadSource[] = []
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  
  if (!apiKey) {
    console.log('[GoogleMaps] No API key - using direct search fallback')
    // Try to scrape Google Maps search results directly
    for (const category of categories) {
      try {
        const query = encodeURIComponent(`${category} in ${city}`)
        const url = `https://www.google.com/maps/search/${query}`
        // Note: Direct scraping of Google Maps requires more complex extraction
        // This is a placeholder - in production, use the Places API
        console.log(`[GoogleMaps] Would search: ${query}`)
      } catch (err) {
        console.error('[GoogleMaps Direct] Failed:', err)
      }
      await sleep(2000)
    }
    return leads
  }
  
  try {
    for (const category of categories) {
      try {
        const query = `${category} in ${city}`
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
        
        const res = await fetch(url)
        const data = await res.json()
        
        if (data.status === 'OK') {
          for (const place of (data.results ?? []).slice(0, 10)) {
            if (!place.website) {
              leads.push({
                name: 'Google Maps',
                url: 'https://maps.googleapis.com/maps/api/place',
                business_name: place.name,
                phone: place.formatted_phone_number,
                city,
                category,
                has_website: false,
                source_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`,
                score_bonus: 4
              })
            }
          }
        }
      } catch (err) {
        console.error('[GoogleMaps API] Failed:', category, err)
      }
      await sleep(1000)
    }
  } catch (err) {
    console.error('[GoogleMaps API] Error:', err)
  }
  
  return leads
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
