/**
 * Google Maps Scraper — finds businesses without websites
 * Uses Google Places API (free tier: 200 calls/day)
 */

export interface RawLead {
  business_name: string
  phone?: string
  email?: string
  city: string
  category?: string
  google_maps_url?: string
  has_website: boolean
  current_website?: string
  instagram_handle?: string
  source: string
  source_url?: string
  source_data: Record<string, unknown>
  score_bonus: number
}

async function getPlaceDetails(placeId: string): Promise<{
  website?: string
  formatted_phone_number?: string
  formatted_address?: string
  types?: string[]
}> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return {}

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website,formatted_phone_number,formatted_address,types&key=${key}`
  const res = await fetch(url)
  const data = await res.json()
  return data.result ?? {}
}

function extractCity(address: string): string {
  const parts = address.split(',')
  // Usually: "Business Name, Area, City, State PIN, India"
  if (parts.length >= 3) return parts[parts.length - 3].trim()
  return parts[0]?.trim() ?? ''
}

export async function scrapeGoogleMaps(queries: string[]): Promise<RawLead[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    console.warn('[GoogleMaps] API key not set — skipping')
    return []
  }

  const leads: RawLead[] = []

  for (const query of queries) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${key}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.status !== 'OK') continue

      for (const place of (data.results ?? []).slice(0, 5)) {
        const details = await getPlaceDetails(place.place_id)

        if (!details.website) {
          leads.push({
            business_name: place.name,
            phone: details.formatted_phone_number,
            city: extractCity(details.formatted_address ?? ''),
            google_maps_url: `https://maps.google.com/?cid=${place.place_id}`,
            category: details.types?.[0],
            has_website: false,
            source: 'google_maps',
            source_url: `https://maps.google.com/?cid=${place.place_id}`,
            source_data: {
              place_id: place.place_id,
              rating: place.rating,
              review_count: place.user_ratings_total,
              query
            },
            score_bonus: 4
          })
        }

        await sleep(300)
      }
    } catch (err) {
      console.error('[GoogleMaps] Query failed:', query, err)
    }

    await sleep(1000)
  }

  return leads
}

export async function scrapeJustDial(city: string, categories: string[]): Promise<RawLead[]> {
  // JustDial doesn't have a public API; we use DuckDuckGo search as a proxy
  const leads: RawLead[] = []

  for (const category of categories) {
    try {
      const query = `site:justdial.com ${category} ${city}`
      // Use DuckDuckGo search via duck-duck-scrape (already in package.json)
      const { search } = await import('duck-duck-scrape')
      const results = await search(query, { safeSearch: 0 })

      for (const result of (results.results ?? []).slice(0, 3)) {
        if (result.url?.includes('justdial.com')) {
          leads.push({
            business_name: result.title?.replace(' - JustDial', '').trim() ?? '',
            city,
            category,
            has_website: false,
            source: 'justdial',
            source_url: result.url,
            source_data: { description: result.description, url: result.url },
            score_bonus: 2
          })
        }
      }
    } catch (err) {
      console.error('[JustDial] Failed:', category, err)
    }

    await sleep(2000)
  }

  return leads
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
