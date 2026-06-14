/**
 * Levitate Labs — Lead Scraper v5
 * 6 sources, all parallel, all under 6s hard cap → total wall-time ~6s (Netlify Free 10s budget)
 *
 * Nominatim (OSM)  — addresses, coordinates, some phones
 * Bing             — web search snippets, site: queries hit cached directory pages
 * Sulekha          — Indian SMB directory, real phones extracted from listing HTML
 * Zomato           — food categories only (returns [] otherwise)
 * Practo           — healthcare categories only (returns [] otherwise)
 * [DDG removed]    — html.duckduckgo.com returns 202 captcha from all server IPs
 *
 * Rate limits: each source is a different domain, 1 request per admin click — no concern.
 * Parallel is always correct here. Sequential/batch would sum timeouts (~28s) and blow the cap.
 */

// ── Cities ────────────────────────────────────────────────────────────────────
export const CITIES: string[] = [
  // Tier 1
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad',
  // Tier 2 — major
  'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal',
  'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra',
  'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Aurangabad',
  'Dhanbad', 'Amritsar', 'Allahabad', 'Coimbatore', 'Navi Mumbai',
  'Howrah', 'Pimpri-Chinchwad', 'Vasai-Virar', 'Thane', 'Kalyan',
  // Tier 2 — growing
  'Srinagar', 'Jodhpur', 'Raipur', 'Kota', 'Ranchi', 'Guwahati',
  'Chandigarh', 'Thiruvananthapuram', 'Kochi', 'Mysuru', 'Hubli',
  'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Jabalpur',
  'Gwalior', 'Vijayawada', 'Guntur', 'Solapur', 'Bareilly', 'Aligarh',
  'Moradabad', 'Saharanpur', 'Gorakhpur', 'Bikaner', 'Udaipur',
  'Jalandhar', 'Bhilai', 'Cuttack', 'Firozabad', 'Nellore', 'Tirupati',
  'Kozhikode', 'Erode', 'Vellore', 'Tirunelveli', 'Bhubaneswar',
  'Siliguri', 'Durgapur', 'Asansol', 'Jamshedpur', 'Rourkela',
  'Panaji', 'Goa', 'Mangaluru', 'Hubballi', 'Davangere', 'Bellary',
  // Tier 3 — MSME-dense
  'Noida', 'Gurugram', 'Manesar', 'Rohtak', 'Hisar', 'Karnal',
  'Ambala', 'Patiala', 'Bathinda', 'Mohali', 'Shimla', 'Dharamshala',
  'Jammu', 'Dehradun', 'Haridwar', 'Rishikesh', 'Mathura', 'Vrindavan',
  'Muzaffarnagar', 'Shahjahanpur', 'Sitapur', 'Rae Bareli', 'Sultanpur',
  'Ayodhya', 'Azamgarh', 'Jaunpur', 'Mirzapur', 'Ghazipur', 'Ballia',
  'Panipat', 'Solan', 'Hapur',
  // More Maharashtra
  'Kolhapur', 'Sangli', 'Latur', 'Nanded', 'Ahmednagar', 'Dhule', 'Jalgaon', 'Akola',
  // More Gujarat
  'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Anand', 'Mehsana',
  // More Karnataka
  'Tumkur', 'Shimoga', 'Bidar', 'Raichur', 'Hassan', 'Udupi',
  // More Tamil Nadu
  'Thanjavur', 'Dindigul', 'Karur', 'Namakkal', 'Vellore', 'Kumbakonam',
  // More Kerala
  'Thrissur', 'Palakkad', 'Malappuram', 'Kollam', 'Kannur', 'Kasaragod',
  // More Rajasthan
  'Ajmer', 'Bharatpur', 'Sikar', 'Alwar', 'Pali', 'Sri Ganganagar',
  // Northeast & East
  'Imphal', 'Shillong', 'Guwahati', 'Agartala', 'Dibrugarh', 'Jorhat',
  // Industrial clusters
  'Pithampur', 'Bhiwadi', 'Neemrana', 'Pantnagar', 'Hosur', 'Baddi',
  // More UP
  'Bareilly', 'Mathura', 'Rampur', 'Muzaffarpur', 'Firozabad',
]

// ── Categories ────────────────────────────────────────────────────────────────
export const CATEGORIES: string[] = [
  // Food & Beverage
  'restaurant', 'cafe', 'bakery', 'cake shop', 'catering', 'cloud kitchen',
  'sweet shop', 'dhaba', 'fast food', 'juice bar', 'ice cream parlour',
  'tiffin service', 'food truck', 'halal food', 'veg restaurant',
  'biryani restaurant', 'pizza shop', 'burger shop',
  // Healthcare
  'clinic', 'hospital', 'dental clinic', 'pharmacy', 'diagnostic centre',
  'physiotherapy', 'ayurveda clinic', 'homeopathy clinic', 'eye clinic',
  'skin clinic', 'orthopedic clinic', 'child specialist', 'maternity clinic',
  'blood bank', 'pathology lab', 'x-ray centre', 'ultrasound centre',
  'psychiatrist', 'nutritionist', 'dietitian',
  // Education
  'school', 'college', 'coaching centre', 'tuition centre', 'yoga studio',
  'dance academy', 'music academy', 'art classes', 'spoken english',
  'computer training', 'vocational training', 'montessori', 'playschool',
  'ias coaching', 'neet coaching', 'jee coaching', 'foreign language classes',
  // Fitness & Wellness
  'gym', 'fitness centre', 'crossfit', 'zumba', 'martial arts',
  'swimming pool', 'aerobics', 'weight loss centre', 'meditation centre',
  // Beauty & Personal Care
  'salon', 'beauty parlour', 'spa', 'nail studio', 'tattoo studio',
  'mehendi artist', 'makeup artist', 'hair extensions', 'barber shop',
  // Fashion & Retail
  'boutique', 'clothing store', 'jeweler', 'footwear store', 'saree store',
  'kurta store', 'kids clothing', 'sports wear', 'ethnic wear', 'underwear store',
  // Electronics & Tech
  'electronics shop', 'mobile shop', 'computer repair', 'laptop repair',
  'cctv installer', 'smart home', 'drone services', 'it support',
  'mobile accessories', 'ac repair', 'water purifier service',
  // Home & Furniture
  'furniture store', 'home decor', 'interior designer', 'modular kitchen',
  'curtains store', 'mattress store', 'paint store', 'hardware store',
  // Grocery & Daily Needs
  'supermarket', 'grocery store', 'organic store', 'dairy products',
  'vegetables wholesale', 'stationery shop', 'general store', 'kirana store',
  // Hospitality & Travel
  'hotel', 'guest house', 'homestay', 'resort', 'travel agency',
  'tour operator', 'visa consultant', 'cab service', 'bus service',
  'packers and movers',
  // Automotive
  'car service', 'driving school', 'car wash', 'auto parts',
  'two wheeler service', 'puncture repair', 'car painting', 'car accessories',
  'ev charging station',
  // Real Estate & Construction
  'real estate', 'property dealer', 'architect', 'civil contractor',
  'interior contractor', 'plumber', 'electrician', 'carpenter',
  'tile shop', 'cement dealer', 'steel dealer', 'solar panel installer',
  // Events & Photography
  'event planner', 'wedding planner', 'photographer', 'videographer',
  'tent house', 'flower decorator', 'caterer', 'band baaja',
  'photo studio', 'drone photography',
  // Printing & Media
  'printing shop', 'flex printing', 'banner printing', 'id card maker',
  'invitation card', 'visiting card', 'packaging company',
  // Digital & Marketing
  'digital marketing', 'graphic designer', 'web designer', 'seo agency',
  'social media agency', 'content writer', 'influencer agency',
  'video production', 'podcast studio',
  // Professional Services
  'chartered accountant', 'lawyer', 'company registration', 'gst consultant',
  'income tax consultant', 'insurance agent', 'loan agent', 'mutual fund',
  'co-working space', 'startup consulting',
  // Manufacturing & Industrial
  'construction company', 'electrical shop', 'pest control',
  'security guard agency', 'printing press', 'garment factory',
  'food processing', 'water treatment',
  // Home Services
  'home cleaning service', 'sofa cleaning', 'appliance repair',
  'painting contractor', 'false ceiling', 'cctv installation',
  // Others
  'courier service', 'laundry', 'dry cleaning', 'book store',
  'gift shop', 'toy store', 'pet shop', 'aquarium shop',
  'religious store', 'repair shop', 'dark store', 'quick commerce',
  // More food
  'continental restaurant', 'chinese restaurant', 'south indian restaurant',
  'north indian restaurant', 'mughlai restaurant', 'italian restaurant',
  'multi cuisine restaurant', 'breakfast cafe', 'tea stall',
  // More healthcare
  'nursing home', 'veterinary clinic', 'physiotherapy centre', 'icu hospital',
  'cancer hospital', 'cardiac clinic', 'fertility clinic',
  // More education
  'abacus classes', 'chess academy', 'ielts coaching', 'french classes',
  'german language classes', 'animation institute', 'fashion design institute',
  // More digital
  'software company', 'mobile app developer', 'ecommerce developer',
  'cloud services', 'cybersecurity firm', 'ui ux designer',
  'data analytics', 'erp software', 'pos software',
  // More industrial/B2B
  'cold storage', 'warehouse', 'logistics company', 'freight forwarding',
  'customs broker', 'exhibition stall maker', 'trade show booth',
  'industrial equipment', 'machine shop', 'fabrication',
  'chemical supplier', 'plastic manufacturer', 'rubber products',
  // More retail
  'optical store', 'hearing aid centre', 'medical equipment',
  'baby products store', 'sports equipment', 'musical instruments',
  'art supply store', 'craft store', 'hobby store',
  // New economy
  'influencer marketing', 'podcast studio', 'content creation studio',
  'coworking space', 'virtual office', 'business centre',
  'ev charging station', 'electric vehicle dealer', 'solar energy company',
  'rainwater harvesting', 'water treatment plant',
]

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ScrapedLead {
  business_name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  city: string
  category: string
  ai_score: number
  status: 'pending'
  raw_data: {
    whatsapp?: string
    instagram?: string
    facebook?: string
    rating?: number
    reviews_count?: number
    opening_hours?: string
    cuisine?: string
    tech_stack?: string
    notes?: string
    text?: string
    deep_scraped?: boolean
    lat?: number
    lon?: number
    osm_id?: string
    source?: string
    social_links?: string[]
    schema_type?: string
  }
}

// ── Comprehensive OSM tag map ─────────────────────────────────────────────────
const OSM_TAGS: Record<string, string[]> = {
  'restaurant': ['amenity=restaurant'],
  'fast food': ['amenity=fast_food'],
  'cafe': ['amenity=cafe'],
  'bakery': ['shop=bakery'],
  'sweet shop': ['shop=confectionery'],
  'dhaba': ['amenity=restaurant'],
  'juice bar': ['amenity=cafe'],
  'ice cream': ['amenity=ice_cream', 'shop=ice_cream'],
  'catering': ['shop=catering'],
  'food truck': ['amenity=fast_food'],
  'cloud kitchen': ['amenity=fast_food'],
  'tiffin': ['amenity=restaurant'],
  'pizza': ['amenity=fast_food'],
  'burger': ['amenity=fast_food'],
  'biryani': ['amenity=restaurant'],
  'hotel': ['tourism=hotel', 'tourism=motel'],
  'guest house': ['tourism=guest_house'],
  'homestay': ['tourism=bed_and_breakfast'],
  'resort': ['tourism=resort'],
  'hospital': ['amenity=hospital'],
  'clinic': ['amenity=clinic', 'healthcare=clinic'],
  'dental': ['healthcare=dentist', 'amenity=dentist'],
  'pharmacy': ['amenity=pharmacy', 'shop=pharmacy'],
  'diagnostic': ['healthcare=laboratory'],
  'physiotherapy': ['healthcare=physiotherapist'],
  'ayurveda': ['healthcare=alternative'],
  'homeopathy': ['healthcare=alternative'],
  'eye clinic': ['healthcare=optometrist'],
  'skin clinic': ['healthcare=dermatologist'],
  'pathology': ['healthcare=laboratory'],
  'blood bank': ['healthcare=blood_bank'],
  'psychiatrist': ['healthcare=psychotherapist'],
  'school': ['amenity=school'],
  'college': ['amenity=college', 'amenity=university'],
  'coaching': ['amenity=training_centre'],
  'tuition': ['amenity=training_centre'],
  'yoga': ['sport=yoga', 'leisure=fitness_centre'],
  'dance': ['leisure=dance'],
  'music': ['amenity=music_school'],
  'playschool': ['amenity=kindergarten'],
  'montessori': ['amenity=kindergarten'],
  'computer training': ['amenity=training_centre'],
  'vocational': ['amenity=training_centre'],
  'gym': ['leisure=fitness_centre'],
  'fitness': ['leisure=fitness_centre', 'leisure=sports_centre'],
  'crossfit': ['leisure=fitness_centre'],
  'swimming': ['leisure=swimming_pool'],
  'martial arts': ['sport=martial_arts'],
  'salon': ['shop=hairdresser'],
  'beauty': ['shop=beauty'],
  'spa': ['leisure=spa'],
  'tattoo': ['shop=tattoo'],
  'barber': ['shop=hairdresser'],
  'boutique': ['shop=clothes'],
  'clothing': ['shop=clothes'],
  'jeweler': ['shop=jewelry', 'shop=jewellery'],
  'footwear': ['shop=shoes'],
  'saree': ['shop=clothes'],
  'kurta': ['shop=clothes'],
  'kids clothing': ['shop=clothes'],
  'sports wear': ['shop=sports'],
  'electronics': ['shop=electronics'],
  'mobile shop': ['shop=mobile_phone'],
  'computer repair': ['shop=computer', 'craft=electronics_repair'],
  'laptop repair': ['shop=computer', 'craft=electronics_repair'],
  'cctv': ['shop=electronics'],
  'furniture': ['shop=furniture'],
  'home decor': ['shop=interior_decoration'],
  'interior design': ['shop=interior_decoration'],
  'modular kitchen': ['shop=kitchen'],
  'mattress': ['shop=furniture'],
  'paint store': ['shop=paint'],
  'hardware': ['shop=hardware'],
  'supermarket': ['shop=supermarket'],
  'grocery': ['shop=grocery', 'shop=convenience'],
  'organic': ['shop=organic', 'shop=health_food'],
  'dairy': ['shop=dairy'],
  'stationery': ['shop=stationery'],
  'general store': ['shop=general'],
  'kirana': ['shop=convenience'],
  'travel agency': ['shop=travel_agency', 'office=travel_agent'],
  'cab': ['amenity=taxi'],
  'packers': ['amenity=moving_company'],
  'car service': ['shop=car_repair'],
  'car wash': ['amenity=car_wash'],
  'auto parts': ['shop=car_parts'],
  'driving school': ['amenity=driving_school'],
  'petrol': ['amenity=fuel'],
  'two wheeler': ['shop=motorcycle_repair'],
  'real estate': ['office=estate_agent'],
  'property dealer': ['office=estate_agent'],
  'architect': ['office=architect'],
  'plumber': ['craft=plumber'],
  'electrician': ['craft=electrician'],
  'carpenter': ['craft=carpenter'],
  'painter': ['craft=painter'],
  'tile shop': ['shop=tiles', 'shop=flooring'],
  'cement': ['shop=building_materials'],
  'steel': ['shop=building_materials'],
  'solar': ['craft=electrician'],
  'event planner': ['office=event_management'],
  'wedding': ['shop=wedding'],
  'photographer': ['shop=photographer'],
  'photo studio': ['shop=photographer'],
  'printing': ['shop=printer', 'shop=copyshop'],
  'digital marketing': ['office=marketing'],
  'graphic design': ['office=graphic_design'],
  'web design': ['office=it'],
  'seo': ['office=marketing'],
  'chartered accountant': ['office=accountant'],
  'lawyer': ['office=lawyer'],
  'insurance': ['office=insurance'],
  'bank': ['amenity=bank'],
  'laundry': ['shop=laundry', 'amenity=laundry'],
  'dry cleaning': ['shop=dry_cleaning'],
  'courier': ['amenity=post_depot'],
  'pest control': ['craft=pest_control'],
  'security': ['office=security'],
  'co-working': ['office=coworking'],
  'book store': ['shop=books'],
  'toy store': ['shop=toys'],
  'gift shop': ['shop=gift'],
  'pet shop': ['shop=pet'],
  'repair shop': ['craft=electronics_repair'],
}

function getOSMTags(category: string): string[] {
  const cat = category.toLowerCase()
  if (OSM_TAGS[cat]) return OSM_TAGS[cat]
  for (const [key, tags] of Object.entries(OSM_TAGS)) {
    if (cat.includes(key) || key.includes(cat.split(' ')[0])) return tags
  }
  return []
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^\d+]/g, '')
  // Indian mobile: 10 digits starting 6-9, optionally prefixed +91 or 0
  const match = digits.match(/(?:\+91|91|0)?([6-9]\d{9})/)
  if (match) return `+91${match[1]}`
  // International landline (non-Indian): keep if 7-15 digits and has country prefix
  if (digits.startsWith('+') && digits.length >= 8 && digits.length <= 16) return digits
  return null
}

function extractEmailFromText(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0]
  if (!match) return null
  const lower = match.toLowerCase()
  // Filter junk
  if (lower.includes('example') || lower.includes('domain') || lower.includes('sentry') ||
      lower.includes('wixpress') || lower.includes('@2x') || lower.includes('.png') ||
      lower.includes('.jpg') || lower.includes('noreply')) return null
  return lower
}

function extractWhatsApp(html: string): string | null {
  // wa.me/919876543210 or wa.me/9876543210
  const waLink = html.match(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=|web\.whatsapp\.com\/send\?phone=)\/?(91)?([6-9]\d{9})/i)
  if (waLink) return `+91${waLink[2]}`
  // WhatsApp widget with number in JS
  const waScript = html.match(/whatsapp[^"']*?(?:\+91|91)?([6-9]\d{9})/i)
  if (waScript) return `+91${waScript[1]}`
  return null
}

function extractSocialLinks(html: string): { instagram?: string; facebook?: string; social_links?: string[] } {
  const socials: string[] = []
  let instagram: string | undefined
  let facebook: string | undefined

  const igMatch = html.match(/instagram\.com\/([A-Za-z0-9_.]{1,30})(?:\/|\?|"|')/i)
  if (igMatch && !['p', 'reel', 'explore', 'accounts', 'stories', 'tv'].includes(igMatch[1])) {
    instagram = `https://instagram.com/${igMatch[1]}`
    socials.push(instagram)
  }

  const fbMatch = html.match(/facebook\.com\/([A-Za-z0-9.]{1,50})(?:\/|\?|"|')/i)
  if (fbMatch && !['sharer', 'dialog', 'login', 'plugins', 'tr'].includes(fbMatch[1])) {
    facebook = `https://facebook.com/${fbMatch[1]}`
    socials.push(facebook)
  }

  const ytMatch = html.match(/youtube\.com\/(channel\/|@|user\/)([A-Za-z0-9_\-]{2,50})/i)
  if (ytMatch) socials.push(`https://youtube.com/${ytMatch[1]}${ytMatch[2]}`)

  const liMatch = html.match(/linkedin\.com\/company\/([A-Za-z0-9\-_]{2,50})/i)
  if (liMatch) socials.push(`https://linkedin.com/company/${liMatch[1]}`)

  return { instagram, facebook, ...(socials.length ? { social_links: socials } : {}) }
}

function extractSchemaOrg(html: string): { name?: string; phone?: string; email?: string; address?: string } {
  try {
    const matches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    for (const m of matches) {
      const json = JSON.parse(m[1])
      const obj = Array.isArray(json) ? json[0] : json
      const type = obj?.['@type'] ?? ''
      if (/LocalBusiness|Organization|Restaurant|Store|Hotel|MedicalClinic|HealthClub|EducationalOrganization/.test(type)) {
        return {
          name: obj.name,
          phone: obj.telephone,
          email: obj.email,
          address: typeof obj.address === 'string'
            ? obj.address
            : [obj.address?.streetAddress, obj.address?.addressLocality].filter(Boolean).join(', '),
        }
      }
    }
  } catch { /* ignore parse errors */ }
  return {}
}

function extractTechStack(html: string): string[] {
  const stack: string[] = []
  if (html.includes('wp-content') || html.includes('wp-includes')) stack.push('WordPress')
  if (html.includes('cdn.shopify.com')) stack.push('Shopify')
  if (html.includes('webflow.io') || html.includes('data-wf-')) stack.push('Webflow')
  if (html.includes('wix.com') || html.includes('_wixCssModule')) stack.push('Wix')
  if (html.includes('squarespace.com')) stack.push('Squarespace')
  if (html.includes('gtag(') || html.includes('google-analytics.com')) stack.push('Google Analytics')
  if (html.includes('fbevents') || html.includes('connect.facebook.net')) stack.push('Facebook Pixel')
  if (html.includes('next/dist') || html.includes('_next/static')) stack.push('Next.js')
  if (html.includes('react') && html.includes('__REACT')) stack.push('React')
  if (html.includes('nuxt') || html.includes('__NUXT__')) stack.push('Nuxt')
  if (html.includes('vue')) stack.push('Vue')
  if (html.includes('elementor')) stack.push('Elementor')
  if (html.includes('divi')) stack.push('Divi')
  if (html.includes('bootstrap')) stack.push('Bootstrap')
  if (html.includes('tailwind')) stack.push('Tailwind')
  if (html.includes('razorpay')) stack.push('Razorpay')
  if (html.includes('tawk.to')) stack.push('Tawk.to Chat')
  return [...new Set(stack)]
}

function scoreFromFields(
  phone: string | null,
  email: string | null,
  website: string | null,
  whatsapp?: string | null,
  social?: { instagram?: string; facebook?: string },
  rating?: number | null,
): number {
  let score = 25
  if (phone) score += 20
  if (whatsapp) score += 20     // WhatsApp is gold for Indian SMBs
  if (email) score += 20
  if (website) score += 10
  if (social?.instagram) score += 3
  if (social?.facebook) score += 2
  if (rating && rating > 4) score += 5
  return Math.min(score, 100)
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pvt|ltd|llp|private|limited|inc|corp|co|and|&|the|a)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 25)
}

// ── Source 1: Overpass API ────────────────────────────────────────────────────

export async function fetchOverpassLeads(city: string, category: string, limit: number): Promise<ScrapedLead[]> {
  const osmTags = getOSMTags(category)

  // Try main instance first, fall back to mirrors on failure
  const OVERPASS_MIRRORS = [
    'https://overpass-api.de',
    'https://overpass.kumi.systems',
    'https://overpass.openstreetmap.fr',
  ]

  async function runQuery(queryBody: string): Promise<ScrapedLead[]> {
    // Race all mirrors in parallel — use whichever responds first with OK
    const controller = new AbortController()
    const body = `data=${encodeURIComponent(queryBody)}`
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'LevitateLabs-LeadGen/5.0 (admin@levitatelabs.online)',
      'Accept': 'application/json',
    }
    let res: Response | null = null
    try {
      res = await Promise.any(
        OVERPASS_MIRRORS.map(mirror =>
          fetch(`${mirror}/api/interpreter`, {
            method: 'POST', headers, body,
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
          }).then(r => { if (!r.ok) throw new Error('not ok'); controller.abort(); return r })
        )
      )
    } catch { return [] }
    if (!res?.ok) return []
    if (!res.ok) return []
    const data = await res.json() as { elements: Array<Record<string, unknown>> }
    const elements = (data.elements ?? []).filter(
      (el) => el.tags && (el.tags as Record<string, string>).name
    )
    return elements.slice(0, limit * 2).map((el): ScrapedLead => {
      const t = el.tags as Record<string, string>
      const phone = normalizePhone(t.phone ?? t['contact:phone'] ?? t['contact:mobile'] ?? null)
      const email = extractEmailFromText(t.email ?? t['contact:email'] ?? '')
      const website = t.website ?? t['contact:website'] ?? null
      const whatsapp = t['contact:whatsapp'] ? normalizePhone(t['contact:whatsapp']) : null
      const lat = (el.lat ?? (el.center as Record<string, number>)?.lat) as number | undefined
      const lon = (el.lon ?? (el.center as Record<string, number>)?.lon) as number | undefined

      let address: string | null = null
      if (t['addr:full']) address = t['addr:full']
      else if (t['addr:street']) {
        address = [t['addr:housenumber'], t['addr:street'], t['addr:city'] ?? city].filter(Boolean).join(' ')
      }

      return {
        business_name: t['name:en'] ?? t.name,
        address,
        phone,
        email,
        website: website ? (website.startsWith('http') ? website : `https://${website}`) : null,
        city,
        category,
        ai_score: scoreFromFields(phone, email, website, whatsapp),
        status: 'pending',
        raw_data: {
          whatsapp: whatsapp ?? undefined,
          opening_hours: t.opening_hours ?? undefined,
          cuisine: t.cuisine ?? undefined,
          lat,
          lon,
          osm_id: String(el.id),
          source: 'overpass',
          deep_scraped: false,
        },
      }
    })
  }

  try {
    let filters: string
    if (osmTags.length > 0) {
      // Use proper OSM tags
      filters = osmTags.map(t => {
        const [k, v] = t.split('=')
        return `nwr[${k}=${v}](area.city);`
      }).join('\n')
    } else {
      // Fallback: name search
      filters = `nwr[name~"${category}",i](area.city);`
    }

    // Primary: area-based query with admin_level
    const primaryQuery = `[out:json][timeout:10];
area[name~"^${city}$",i][admin_level~"^[4-9]$"]->.city;
(
${filters}
);
out tags center ${limit * 3};`

    let results = await withTimeout(runQuery(primaryQuery), 11000, [])

    // Fallback 1: relax admin_level constraint
    if (results.length < 3) {
      const fallbackQuery = `[out:json][timeout:10];
area[name~"^${city}$",i]->.city;
(
${filters}
);
out tags center ${limit * 3};`
      const fallbackResults = await withTimeout(runQuery(fallbackQuery), 10000, [])
      if (fallbackResults.length > results.length) results = fallbackResults
    }

    // Fallback 2: text-search by city name in address tags (works without admin boundaries)
    if (results.length < 3 && osmTags.length > 0) {
      const [k, v] = osmTags[0].split('=')
      const textQuery = `[out:json][timeout:10];
(
  nwr[${k}=${v}]["addr:city"~"${city}",i];
  nwr[${k}=${v}]["is_in:city"~"${city}",i];
);
out tags center ${limit * 3};`
      const textResults = await withTimeout(runQuery(textQuery), 10000, [])
      if (textResults.length > results.length) results = textResults
    }

    return results
  } catch {
    return []
  }
}

// ── Source 2: Nominatim ───────────────────────────────────────────────────────

export async function fetchNominatimLeads(city: string, category: string, limit: number): Promise<ScrapedLead[]> {
  try {
    // Try multiple query strategies
    const queries = [
      `${category} ${city} India`,
      `${category} in ${city}`,
    ]

    let bestResults: ScrapedLead[] = []

    for (const q of queries) {
      if (bestResults.length >= limit) break
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=${Math.min(limit * 2, 50)}&extratags=1&namedetails=1&countrycodes=in`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'LevitateLabs-LeadGen/4.0 (admin@levitatelabs.online)' },
          signal: AbortSignal.timeout(7000),
        })
        if (!res.ok) continue
        const results = await res.json() as Array<Record<string, unknown>>
        const leads = results
          .filter((item) => item.name || (item.namedetails as Record<string, string>)?.name)
          .map((item): ScrapedLead => {
            const extra = (item.extratags ?? {}) as Record<string, string>
            const phone = normalizePhone(extra.phone ?? extra['contact:phone'] ?? extra['contact:mobile'] ?? null)
            const email = extractEmailFromText(extra.email ?? extra['contact:email'] ?? '')
            const website = extra.website ?? extra['contact:website'] ?? null
            const whatsapp = extra['contact:whatsapp'] ? normalizePhone(extra['contact:whatsapp']) : null

            return {
              business_name: String(item.name ?? (item.display_name as string).split(',')[0]),
              address: String(item.display_name ?? ''),
              phone,
              email,
              website: website ? (website.startsWith('http') ? website : `https://${website}`) : null,
              city,
              category,
              ai_score: scoreFromFields(phone, email, website, whatsapp),
              status: 'pending',
              raw_data: {
                whatsapp: whatsapp ?? undefined,
                lat: parseFloat(String(item.lat ?? 0)),
                lon: parseFloat(String(item.lon ?? 0)),
                source: 'nominatim',
                deep_scraped: false,
              },
            }
          })
        if (leads.length > bestResults.length) bestResults = leads
      } catch { /* continue */ }
    }

    return bestResults.slice(0, limit)
  } catch {
    return []
  }
}

// ── Source 3: DuckDuckGo ──────────────────────────────────────────────────────

// DDG HTML endpoint — no VQD token needed, no npm package, no rate-limit anomaly errors
// duck-duck-scrape (the old approach) broke when DDG changed their anti-bot; this is scrape-safe
export async function fetchDDGLeads(city: string, category: string, limit: number): Promise<ScrapedLead[]> {
  try {
    const queries = [
      `"${category}" "${city}" site:justdial.com OR site:sulekha.com`,
      `${category} in ${city} India phone number`,
    ]
    const allResults: ScrapedLead[] = []
    const seen = new Set<string>()

    for (const query of queries) {
      if (allResults.length >= limit) break
      try {
        const res = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=in-en`,
          {
            method: 'POST',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'text/html',
              'Accept-Language': 'en-IN,en;q=0.9',
            },
            body: `q=${encodeURIComponent(query)}&kl=in-en`,
            signal: AbortSignal.timeout(4500),
          }
        )
        if (!res.ok) break
        const html = await res.text()

        // DDG HTML: titles in <a class="result__a">, snippets in <a class="result__snippet">
        const titleMatches  = [...html.matchAll(/class="result__a"[^>]*>([^<]{3,80})</g)]
        const snippetMatches = [...html.matchAll(/class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g)]
        const urlMatches    = [...html.matchAll(/class="result__url"[^>]*>\s*([^\s<]{5,120})/g)]

        const GENERIC_DDG = /^(what|how|why|when|where|is |are |can |best|top \d|list|find|get |free|download|video|image|news|faq|blog|review|home|about|login)/i
        for (let i = 0; i < titleMatches.length && allResults.length < limit; i++) {
          const rawTitle = titleMatches[i][1]?.trim()
          if (!rawTitle) continue
          const cleanName = rawTitle.split('|')[0].split(' - ')[0].split('–')[0].trim().slice(0, 80)
          if (cleanName.length < 4 || GENERIC_DDG.test(cleanName)) continue
          const key = normalizeName(cleanName)
          if (!key || seen.has(key)) continue
          seen.add(key)

          const snippetRaw = snippetMatches[i]?.[1]?.replace(/<[^>]+>/g, ' ') ?? ''
          const text = `${rawTitle} ${snippetRaw}`.replace(/\s+/g, ' ')
          const phone   = normalizePhone(text.match(/(?:\+91[\s-]?)?[6-9]\d{9}/)?.[0] ?? null)
          const email   = extractEmailFromText(text)
          const rawUrl  = urlMatches[i]?.[1]?.trim() ?? null
          const website = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`) : null

          allResults.push({
            business_name: cleanName,
            address: null,
            phone,
            email,
            website,
            city,
            category,
            ai_score: scoreFromFields(phone, email, website),
            status: 'pending',
            raw_data: { text: text.slice(0, 300), source: 'duckduckgo', deep_scraped: false },
          })
        }
      } catch { break }
    }

    return allResults.slice(0, limit)
  } catch {
    return []
  }
}

// ── Source 5: Sulekha ────────────────────────────────────────────────────────

// Maps our category names → Sulekha URL slugs (verified working)
const SULEKHA_CATEGORY_MAP: Record<string, string> = {
  // Food
  'restaurant': 'restaurants',
  'cafe': 'restaurants',
  'bakery': 'bakeries',
  'sweet shop': 'sweet-shops',
  'dhaba': 'restaurants',
  'fast food': 'restaurants',
  'catering': 'catering-services',
  'cloud kitchen': 'restaurants',
  'tiffin service': 'tiffin-services',
  'biryani restaurant': 'restaurants',
  'pizza shop': 'restaurants',
  'burger shop': 'restaurants',
  'veg restaurant': 'restaurants',
  'halal food': 'restaurants',
  // Healthcare
  'clinic': 'clinics',
  'hospital': 'nursing-homes',
  'dental clinic': 'dentists',
  'pharmacy': 'pharmacies',
  'diagnostic centre': 'diagnostic-centres',
  'physiotherapy': 'physiotherapy-centres',
  'ayurveda clinic': 'ayurvedic-clinics',
  'homeopathy clinic': 'homeopathy-clinics',
  'eye clinic': 'eye-hospitals',
  'skin clinic': 'skin-clinics',
  'blood bank': 'blood-banks',
  'pathology lab': 'pathology-labs',
  'nutritionist': 'dietitians-nutritionists',
  'dietitian': 'dietitians-nutritionists',
  // Education
  'school': 'schools',
  'coaching centre': 'coaching-centres',
  'tuition centre': 'tuition-centres',
  'yoga studio': 'yoga-classes',
  'dance academy': 'dance-classes',
  'music academy': 'music-classes',
  'art classes': 'fine-arts-classes',
  'spoken english': 'spoken-english-classes',
  'computer training': 'computer-training-institutes',
  'ias coaching': 'ias-coaching-centres',
  'playschool': 'playschools',
  'montessori': 'playschools',
  // Fitness
  'gym': 'gyms',
  'fitness centre': 'gyms',
  'crossfit': 'gyms',
  'swimming pool': 'swimming-pools',
  'martial arts': 'martial-arts-classes',
  // Beauty
  'salon': 'salons',
  'beauty parlour': 'beauty-parlours',
  'spa': 'spas',
  'tattoo studio': 'tattoo-studios',
  'mehendi artist': 'mehendi-artists',
  'makeup artist': 'makeup-artists',
  // Fashion
  'boutique': 'boutiques',
  'jeweler': 'jewellers',
  // Home Services
  'interior designer': 'interior-designers-decorators',
  'plumber': 'plumbers',
  'electrician': 'electricians',
  'carpenter': 'carpenters',
  'painter': 'painters',
  'painting contractor': 'painters',
  'home cleaning service': 'home-cleaning-services',
  'pest control': 'pest-control-services',
  'sofa cleaning': 'home-cleaning-services',
  'ac repair': 'ac-repair-services',
  'water purifier service': 'water-purifier-services',
  'appliance repair': 'home-appliance-repair',
  'cctv installation': 'cctv-installation',
  // Construction
  'architect': 'architects',
  'civil contractor': 'builders',
  'interior contractor': 'interior-designers-decorators',
  'builder': 'builders',
  'modular kitchen': 'modular-kitchen',
  'solar panel installer': 'solar-panel-installation',
  // Hospitality
  'hotel': 'hotels',
  'guest house': 'hotels',
  'resort': 'resorts',
  'travel agency': 'travel-agents',
  'tour operator': 'tour-operators',
  'cab service': 'cab-services',
  'packers and movers': 'packers-and-movers',
  // Automotive
  'car service': 'car-repair-service-centres',
  'driving school': 'driving-schools',
  'car wash': 'car-wash',
  // Real Estate
  'real estate': 'real-estate-agents',
  'property dealer': 'real-estate-agents',
  // Events
  'event planner': 'event-management-companies',
  'wedding planner': 'wedding-planners',
  'photographer': 'photographers',
  'videographer': 'videographers',
  'photo studio': 'photographers',
  'drone photography': 'photographers',
  // Professional
  'chartered accountant': 'chartered-accountants',
  'lawyer': 'advocates-lawyers',
  'company registration': 'gst-consultants',
  'gst consultant': 'gst-consultants',
  'income tax consultant': 'income-tax-consultants',
  'insurance agent': 'insurance-agents',
  'loan agent': 'loan-agents',
  // Other services
  'laundry': 'laundry-services',
  'dry cleaning': 'dry-cleaning-services',
  'courier service': 'courier-services',
  'digital marketing': 'software-companies',
  'graphic designer': 'graphic-designers',
  'web designer': 'web-designers',
  'security guard agency': 'security-guard-services',
  'software': 'software-companies',
  'it support': 'software-companies',
  'web development': 'software-companies',
  'app development': 'software-companies',
  'seo agency': 'software-companies',
  'social media agency': 'software-companies',
  'printing shop': 'printing-services',
  'flex printing': 'printing-services',
  'banner printing': 'printing-services',
  'packaging company': 'printing-services',
  'home cleaning': 'home-cleaning-services',
  'fashion designer': 'fashion-designers',
  'mutual fund': 'mutual-funds',
}

function getSulekhaSlug(category: string): string | null {
  const cat = category.toLowerCase()
  if (SULEKHA_CATEGORY_MAP[cat]) return SULEKHA_CATEGORY_MAP[cat]
  // Partial match
  for (const [key, slug] of Object.entries(SULEKHA_CATEGORY_MAP)) {
    if (cat.includes(key) || key.includes(cat.split(' ')[0])) return slug
  }
  // Fallback: pluralize and kebab-case the category
  return cat.replace(/\s+/g, '-') + 's'
}

function sulekhaCity(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-')
}

export async function fetchSulekhaLeads(city: string, category: string, limit: number): Promise<ScrapedLead[]> {
  try {
    const slug = getSulekhaSlug(category)
    if (!slug) return []

    const url = `https://www.sulekha.com/${slug}/${sulekhaCity(city)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
        'Accept-Encoding': 'identity',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) return []
    const html = await res.text()

    // Extract business names and IDs
    const nameMatches = [...html.matchAll(/businessName="([^"]+)"/g)]
    const idMatches = [...html.matchAll(/businessId="([^"]+)"/g)]

    // Deduplicate names (each business appears twice in HTML)
    const seen = new Set<string>()
    const businesses: Array<{ name: string; id: string; phone: string | null }> = []

    for (let i = 0; i < nameMatches.length; i++) {
      const name = nameMatches[i][1].trim()
      const id = idMatches[i]?.[1] ?? ''
      if (!name || seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())

      // Extract phone from the HTML section nearest to this business entry
      const idOffset = html.indexOf(`businessId="${id}"`)
      const bizSection = idOffset >= 0
        ? html.slice(idOffset, idOffset + 2000)
        : ''
      const phone = normalizePhone(bizSection.match(/[6-9]\d{9}/)?.[0] ?? null)

      businesses.push({ name, id, phone })
      if (businesses.length >= limit * 2) break
    }

    const leads: ScrapedLead[] = businesses.slice(0, limit * 2).map((biz) => ({
      business_name: biz.name,
      address: null,
      phone: biz.phone,
      email: null,
      website: null,
      city,
      category,
      ai_score: scoreFromFields(biz.phone, null, null),
      status: 'pending',
      raw_data: { source: 'sulekha', deep_scraped: false },
    }))

    return leads.slice(0, limit)
  } catch {
    return []
  }
}

// ── Source 6: Zomato (food categories only) ───────────────────────────────────

const ZOMATO_FOOD_CATEGORIES = new Set([
  'restaurant', 'cafe', 'bakery', 'sweet shop', 'dhaba', 'fast food',
  'catering', 'cloud kitchen', 'tiffin service', 'halal food', 'veg restaurant',
  'biryani restaurant', 'pizza shop', 'burger shop', 'juice bar',
  'ice cream parlour', 'food truck',
])

// Maps our category names → Zomato URL paths
const ZOMATO_CATEGORY_PATH: Record<string, string> = {
  'restaurant': 'restaurants',
  'cafe': 'cafes',
  'bakery': 'cafes',
  'fast food': 'fast-food',
  'biryani restaurant': 'biryani',
  'veg restaurant': 'pure-veg-restaurants',
  'pizza shop': 'pizza',
  'burger shop': 'burger',
  'sweet shop': 'restaurants',
  'dhaba': 'restaurants',
  'cloud kitchen': 'restaurants',
  'tiffin service': 'restaurants',
  'food truck': 'restaurants',
  'juice bar': 'cafes',
  'ice cream parlour': 'desserts',
  'halal food': 'restaurants',
  'catering': 'restaurants',
}

// Maps our city names → Zomato city slugs
const ZOMATO_CITY_MAP: Record<string, string> = {
  'Mumbai': 'mumbai',
  'Delhi': 'ncr',
  'Bangalore': 'bangalore',
  'Hyderabad': 'hyderabad',
  'Chennai': 'chennai',
  'Kolkata': 'kolkata',
  'Pune': 'pune',
  'Ahmedabad': 'ahmedabad',
  'Jaipur': 'jaipur',
  'Chandigarh': 'chandigarh',
  'Kochi': 'kochi',
  'Indore': 'indore',
  'Bhopal': 'bhopal',
  'Nagpur': 'nagpur',
  'Surat': 'surat',
  'Lucknow': 'lucknow',
  'Coimbatore': 'coimbatore',
  'Goa': 'goa',
  'Panaji': 'goa',
  'Mysuru': 'mysore',
  'Vadodara': 'baroda',
  'Visakhapatnam': 'vizag',
  'Noida': 'ncr',
  'Gurugram': 'ncr',
  'Ghaziabad': 'ncr',
  'Navi Mumbai': 'mumbai',
  'Thane': 'mumbai',
  'Pimpri-Chinchwad': 'pune',
  'Howrah': 'kolkata',
  'Kota': 'kota',
  'Jodhpur': 'jodhpur',
  'Udaipur': 'udaipur',
}

// ── Source 6: Practo (healthcare categories only) ─────────────────────────────

const PRACTO_HEALTHCARE_CATEGORIES = new Set([
  'clinic', 'hospital', 'dental clinic', 'pharmacy', 'diagnostic centre',
  'physiotherapy', 'ayurveda clinic', 'homeopathy clinic', 'eye clinic',
  'skin clinic', 'orthopedic clinic', 'child specialist', 'maternity clinic',
  'blood bank', 'pathology lab', 'x-ray centre', 'ultrasound centre',
  'psychiatrist', 'nutritionist', 'dietitian', 'nursing homes',
])

const PRACTO_CATEGORY_PATH: Record<string, string> = {
  'clinic': 'doctor',
  'hospital': 'doctor',
  'dental clinic': 'dentist',
  'pharmacy': 'pharmacies',
  'diagnostic centre': 'diagnostic-centres',
  'physiotherapy': 'physiotherapist',
  'ayurveda clinic': 'ayurvedic',
  'homeopathy clinic': 'homeopathy',
  'eye clinic': 'ophthalmologist',
  'skin clinic': 'dermatologist',
  'orthopedic clinic': 'orthopedic',
  'child specialist': 'pediatrician',
  'maternity clinic': 'gynaecologist',
  'pathology lab': 'diagnostic-centres',
  'psychiatrist': 'psychiatrist',
  'nutritionist': 'dietitian-nutritionist',
  'dietitian': 'dietitian-nutritionist',
}

const PRACTO_CITY_MAP: Record<string, string> = {
  'Mumbai': 'mumbai', 'Delhi': 'delhi', 'Bangalore': 'bangalore',
  'Hyderabad': 'hyderabad', 'Chennai': 'chennai', 'Kolkata': 'kolkata',
  'Pune': 'pune', 'Ahmedabad': 'ahmedabad', 'Jaipur': 'jaipur',
  'Chandigarh': 'chandigarh', 'Kochi': 'kochi', 'Indore': 'indore',
  'Bhopal': 'bhopal', 'Nagpur': 'nagpur', 'Surat': 'surat',
  'Lucknow': 'lucknow', 'Noida': 'noida', 'Gurugram': 'gurgaon',
  'Visakhapatnam': 'vizag', 'Coimbatore': 'coimbatore',
  'Navi Mumbai': 'navi-mumbai', 'Thane': 'thane',
  'Mysuru': 'mysore', 'Vadodara': 'baroda', 'Goa': 'goa',
}

// Practo's own booking numbers that appear on every listing — not actual clinic phones
const PRACTO_OWN_NUMBERS = new Set(['9393356509', '8719081708', '9785826351', '6666666667', '7777777778', '8888888889'])

function isFakePractoPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '').slice(-10)
  if (digits.length < 10) return true
  if (PRACTO_OWN_NUMBERS.has(digits)) return true
  // Repeated digit pattern (e.g. 6666666667)
  const counts = new Map<string, number>()
  for (const d of digits) counts.set(d, (counts.get(d) ?? 0) + 1)
  return Math.max(...counts.values()) >= 8
}

export async function fetchPractoLeads(city: string, category: string, limit: number): Promise<ScrapedLead[]> {
  if (!PRACTO_HEALTHCARE_CATEGORIES.has(category.toLowerCase())) return []
  const citySlug = PRACTO_CITY_MAP[city]
  if (!citySlug) return []
  const catPath = PRACTO_CATEGORY_PATH[category.toLowerCase()] ?? 'doctor'

  try {
    const res = await fetch(`https://www.practo.com/${citySlug}/${catPath}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'text/html',
        'Accept-Encoding': 'identity',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    const html = await res.text()

    // Extract doctor/clinic names
    const nameMatches = [
      ...[...html.matchAll(/"name"\s*:\s*"(Dr\.[^"]{3,60})"/g)].map(m => m[1]),
      ...[...html.matchAll(/"name"\s*:\s*"([^"]{5,60}(?:Clinic|Hospital|Centre|Care|Health)[^"]{0,40})"/g)].map(m => m[1]),
    ]
    const seen = new Set<string>()
    const names = nameMatches.filter(n => {
      const k = n.toLowerCase().trim()
      if (!k || seen.has(k)) return false
      seen.add(k)
      return true
    }).slice(0, limit * 2)

    // Practo does not expose real clinic phones in listing HTML — only their own booking numbers.
    // Extract ratings only — phones come from deep-scraping individual Practo profiles.
    const ratings = [...html.matchAll(/"ratingValue"\s*:\s*"([0-9.]+)"/g)].map(m => parseFloat(m[1]))

    return names.slice(0, limit).map((name, idx): ScrapedLead => {
      const rating = ratings[idx]
      // Store the individual profile search URL so deep-scrape can find the actual contact
      const profileSearchUrl = `https://www.practo.com/${citySlug}/search?results_type=doctor&q=${encodeURIComponent(name)}&city=${citySlug}`

      return {
        business_name: name,
        address: null,
        phone: null,
        email: null,
        website: profileSearchUrl,
        city,
        category,
        ai_score: scoreFromFields(null, null, 'https://practo.com', null, undefined, rating),
        status: 'pending',
        raw_data: {
          rating,
          source: 'practo',
          deep_scraped: false,
        },
      }
    })
  } catch {
    return []
  }
}

interface ZomatoRestaurant {
  name: string
  url?: string
  address?: { streetAddress?: string }
  aggregateRating?: { ratingValue?: string; reviewCount?: string }
}

export async function fetchZomatoLeads(city: string, category: string, limit: number): Promise<ScrapedLead[]> {
  if (!ZOMATO_FOOD_CATEGORIES.has(category.toLowerCase())) return []

  const citySlug = ZOMATO_CITY_MAP[city]
  if (!citySlug) return []

  const catPath = ZOMATO_CATEGORY_PATH[category.toLowerCase()] ?? 'restaurants'

  try {
    const res = await fetch(`https://www.zomato.com/${citySlug}/${catPath}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'text/html',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return []
    const html = await res.text()

    // Extract ItemList JSON-LD
    const jsonlds = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    let restaurants: ZomatoRestaurant[] = []

    for (const m of jsonlds) {
      try {
        const j = JSON.parse(m[1]) as Record<string, unknown>
        if (j['@type'] === 'ItemList' && Array.isArray(j.itemListElement)) {
          restaurants = (j.itemListElement as Array<{ item?: ZomatoRestaurant }>)
            .map(i => i.item)
            .filter((r): r is ZomatoRestaurant => !!r?.name)
          break
        }
      } catch { /* continue */ }
    }

    return restaurants.slice(0, limit).map((r): ScrapedLead => {
      const rating = r.aggregateRating?.ratingValue ? parseFloat(r.aggregateRating.ratingValue) : undefined
      const address = r.address?.streetAddress ?? null

      return {
        business_name: r.name,
        address,
        phone: null,
        email: null,
        website: r.url ? `https://www.zomato.com${r.url}` : null,
        city,
        category,
        ai_score: scoreFromFields(null, null, r.url ? 'https://zomato.com' : null, null, undefined, rating),
        status: 'pending',
        raw_data: {
          rating,
          reviews_count: r.aggregateRating?.reviewCount
            ? parseInt(r.aggregateRating.reviewCount.replace(/,/g, ''))
            : undefined,
          source: 'zomato',
          deep_scraped: false,
        },
      }
    })
  } catch {
    return []
  }
}

// ── Source 7: Website deep crawl ─────────────────────────────────────────────

const CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us', '/reach-us', '/get-in-touch']

export async function deepScrapeWebsite(lead: ScrapedLead): Promise<Partial<ScrapedLead>> {
  if (!lead.website) return {}
  try {
    const { load } = await import('cheerio')
    const baseUrl = new URL(lead.website)

    async function fetchPage(path: string): Promise<string> {
      const res = await fetch(`${baseUrl.origin}${path}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return ''
      return res.text()
    }

    // Fetch homepage
    const homeHtml = await fetchPage(baseUrl.pathname || '/').catch(() => '')
    if (!homeHtml) return {}

    const $home = load(homeHtml)
    const homeText = $home('body').text()

    // Find contact/about page link in nav
    let contactHtml = ''
    const navLinks = $home('a[href]').map((_, el) => $home(el).attr('href') ?? '').get()
    const contactHref = navLinks.find(h =>
      /contact|about|reach|touch/i.test(h) && !h.startsWith('http')
    )
    if (contactHref) {
      contactHtml = await fetchPage(contactHref.startsWith('/') ? contactHref : `/${contactHref}`).catch(() => '')
    }
    // If no contact link found in nav, try common paths
    if (!contactHtml) {
      for (const path of CONTACT_PATHS) {
        contactHtml = await fetchPage(path).catch(() => '')
        if (contactHtml) break
      }
    }

    const fullHtml = homeHtml + (contactHtml ?? '')
    const $contact = contactHtml ? load(contactHtml) : $home
    const contactText = contactHtml ? $contact('body').text() : homeText

    // Extract phone (prefer tel: href anchors — more reliable)
    const telHrefs = $home('a[href^="tel:"]').map((_, el) => $home(el).attr('href') ?? '').get()
    const telFromHref = telHrefs.map(h => normalizePhone(h.replace('tel:', ''))).find(Boolean)

    // Extract from contact page too
    const telHrefsContact = contactHtml
      ? $contact('a[href^="tel:"]').map((_, el) => $contact(el).attr('href') ?? '').get()
      : []
    const telFromContactHref = telHrefsContact.map(h => normalizePhone(h.replace('tel:', ''))).find(Boolean)

    const phone = lead.phone
      ?? telFromHref
      ?? telFromContactHref
      ?? normalizePhone(homeText.match(/(?:\+91|0)?[6-9]\d{9}/)?.[0] ?? null)
      ?? normalizePhone(contactText.match(/(?:\+91|0)?[6-9]\d{9}/)?.[0] ?? null)

    // Extract email (prefer mailto: href)
    const mailHrefs = [
      ...$home('a[href^="mailto:"]').map((_, el) => $home(el).attr('href') ?? '').get(),
      ...($contact !== $home ? $contact('a[href^="mailto:"]').map((_, el) => $contact(el).attr('href') ?? '').get() : []),
    ]
    const emailFromHref = mailHrefs.map(h => extractEmailFromText(h.replace('mailto:', ''))).find(Boolean)
    const email = lead.email
      ?? emailFromHref
      ?? extractEmailFromText(homeText)
      ?? extractEmailFromText(contactText)

    // WhatsApp
    const whatsapp = lead.raw_data?.whatsapp ?? extractWhatsApp(fullHtml) ?? undefined

    // Social links
    const socials = extractSocialLinks(fullHtml)

    // JSON-LD schema
    const schema = extractSchemaOrg(homeHtml)
    const schemaPhone = schema.phone ? normalizePhone(schema.phone) : null
    const schemaEmail = schema.email ? extractEmailFromText(schema.email) : null

    // Tech stack
    const techStack = extractTechStack(homeHtml)

    const finalPhone = phone ?? schemaPhone
    const finalEmail = email ?? schemaEmail

    return {
      phone: finalPhone ?? lead.phone,
      email: finalEmail ?? lead.email,
      raw_data: {
        ...lead.raw_data,
        whatsapp: whatsapp ?? lead.raw_data?.whatsapp,
        instagram: socials.instagram,
        facebook: socials.facebook,
        social_links: socials.social_links,
        tech_stack: techStack.join(', ') || undefined,
        schema_type: schema.name ? 'LocalBusiness' : undefined,
        deep_scraped: true,
      },
      ai_score: scoreFromFields(finalPhone, finalEmail, lead.website, whatsapp, socials),
    }
  } catch {
    return {}
  }
}

// ── Source 8: Bing Web Search ─────────────────────────────────────────────────
// General-purpose fallback — same snippet approach as DDG, different domain, no rate-limit overlap

export async function fetchBingLeads(city: string, category: string, limit: number): Promise<ScrapedLead[]> {
  try {
    const queries = [
      `"${category}" "${city}" site:justdial.com OR site:sulekha.com OR site:indiamart.com OR site:tradeindia.com`,
      `"${category}" "${city}" site:yellowpages.co.in OR site:asklaila.com OR site:shopclues.com OR site:india.com`,
    ]
    const allResults: ScrapedLead[] = []
    const seen = new Set<string>()

    for (const query of queries) {
      if (allResults.length >= limit) break
      try {
        const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20&setmkt=en-IN`
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-IN,en;q=0.9',
            Accept: 'text/html',
          },
          signal: AbortSignal.timeout(4000),
        })
        if (!res.ok) break
        const html = await res.text()

        // Each Bing result is in <li class="b_algo">
        // Reject non-business titles: URLs, generic pages, news, foreign content, major brands
        const GENERIC_TITLE = new RegExp(
          // Looks like a URL (domain pattern)
          '^www\\.|\\.(com|net|org|au|ua|uk|ca|de|fr|ru|cn|jp|br|za|nz|sg|my|ph|pk|bd)(\\/|$)' +
          // Starts with question/listicle/foreign words
          '|^(what|how|why|when|where|is |are |can |best |top \\d|list of|find |get |free |download|video|image|news|about|home|contact|login|sign |faq|blog|review|compare|comparativa|tipos|tabla|guia|guide|todo|all |les |la |le |un |une |nouveau|nouvelle|tarif|prix|avis)' +
          // Major global brands (not Indian local businesses)
          '|^(toyota|honda|suzuki|hyundai|ford|bmw|mercedes|audi|volkswagen|kia|tesla|apple|samsung|google|microsoft|amazon|facebook|meta|netflix|uber|ola|zomato|swiggy|flipkart|myntra|paytm|phonepe)' +
          // Foreign government / non-Indian institutions
          '|\\b(ontario|alberta|queensland|northern territory|south australia|western australia|new south wales|british columbia|government of|ministry of|department of|council of|municipality of|district of|province of)\\b' +
          // News/political keywords
          '|\\b(trump|biden|modi|court|police|minister|election|parliament|verdict|congress|bjp|aap|rupee|sensex|nifty|inflation|rbi|budget|gutfeld|fox news|cnn|bbc|ndtv|times of india)\\b' +
          // Non-ASCII foreign language characters
          '|[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿœ€£¥]' +
          // Article/comparison titles
          '|\\b(vs\\.|versus|comparison|specification|spec|facelift|launch date|unveiled|announced|rumour|leak|portal|directory|database|registry|repository)\\b' +
          // Ends with ellipsis
          '|\\.{3}$',
          'i'
        )
        const resultBlocks = [...html.matchAll(/<li[^>]+b_algo[^>]*>([\s\S]*?)<\/li>/g)]
        for (const m of resultBlocks.slice(0, 12)) {
          const block = m[1]
          // Title from <h2>
          const title = block.match(/<h2[^>]*>(?:<a[^>]*>)?([^<]{3,80})/)?.[1]?.trim()
          if (!title) continue
          const cleanName = title.split('|')[0].split(' - ')[0].split('–')[0].trim().slice(0, 80)
          // Skip generic web page titles — not business names
          if (cleanName.length < 4 || GENERIC_TITLE.test(cleanName)) continue
          const key = normalizeName(cleanName)
          if (!key || seen.has(key)) continue
          seen.add(key)

          const text = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
          const phone = normalizePhone(text.match(/(?:\+91[\s-]?)?[6-9]\d{9}/)?.[0] ?? null)
          const email = extractEmailFromText(text)

          // Best external URL from result
          const urlMatch = block.match(/href="(https?:\/\/(?!(?:www\.)?bing\.com)[^"]{8,120})"/)?.[1] ?? null

          allResults.push({
            business_name: cleanName,
            address: null,
            phone,
            email,
            website: urlMatch,
            city,
            category,
            ai_score: scoreFromFields(phone, email, urlMatch),
            status: 'pending',
            raw_data: { text: text.slice(0, 300), source: 'bing', deep_scraped: false },
          })
        }
      } catch { break }
    }

    return allResults.slice(0, limit)
  } catch {
    return []
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function scrapeLeads(
  city: string,
  category: string,
  limit: number,
): Promise<ScrapedLead[]> {
  const perSource = Math.ceil(limit * 2)

  // 5 sources in parallel — DDG removed (blocked by 202 captcha from all server IPs)
  // Zomato returns [] for non-food; Practo returns [] for non-health — other 3 always run
  const settled = await Promise.allSettled([
    withTimeout(fetchNominatimLeads(city, category, perSource), 5000, []),
    withTimeout(fetchBingLeads(city, category, Math.ceil(limit / 2)), 5000, []),
    withTimeout(fetchSulekhaLeads(city, category, perSource), 6000, []),
    withTimeout(fetchZomatoLeads(city, category, perSource), 5000, []),
    withTimeout(fetchPractoLeads(city, category, perSource), 5000, []),
  ])

  const raw = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  // Deduplicate on normalized name
  const seen = new Set<string>()
  const deduped = raw.filter((lead) => {
    const key = normalizeName(lead.business_name)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduped.sort((a, b) => b.ai_score - a.ai_score).slice(0, limit)
}
