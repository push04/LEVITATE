/**
 * FREE Web Scraper - No API Keys Required
 * 100% FREE sources for finding businesses without websites in India.
 *
 * Sources:
 *   1. JustDial         — India's largest local business directory
 *   2. IndiaMART        — B2B supplier listings
 *   3. Sulekha          — Local services directory
 *   4. YellowPages IN   — Business listings
 *   5. TradeIndia       — B2B business directory
 *   6. Overpass API     — OpenStreetMap data (100% free, no key, real GPS data)
 *   7. Zomato public    — Restaurant listings (public pages, no key)
 *   8. Practo public    — Doctor/clinic listings (public pages, no key)
 *   9. ExportersIndia   — Manufacturer/exporter listings
 */

// Netlify scheduled functions: timeout is controlled in netlify.toml
// bizdev.mts stays under 10s by running only 2 combos per run

export interface ScrapedLead {
  business_name: string
  phone?: string
  email?: string
  city: string
  category: string
  has_website: boolean
  current_website?: string
  source: string
  source_url?: string
  google_maps_url?: string
  score_bonus: number
  source_data?: Record<string, unknown>
}

export const CITIES = [
  // Tier 1 — Maximum business density, most leads guaranteed
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
  'Ahmedabad', 'Pune', 'Surat', 'Jaipur',

  // Tier 2 — Large cities, well listed on Google Maps & JustDial
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
  'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana',
  'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi',
  'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Allahabad',
  'Ranchi', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur',
  'Madurai', 'Raipur', 'Kota', 'Chandigarh', 'Guwahati',
  'Solapur', 'Hubli', 'Bareilly', 'Moradabad', 'Mysore',
  'Tiruchirappalli', 'Thiruvananthapuram', 'Coimbatore', 'Kochi',

  // Tier 2B — Strong regional cities, decent scraping yield
  'Noida', 'Gurgaon', 'Navi Mumbai', 'Kalyan', 'Thane',
  'Bhiwandi', 'Ulhasnagar', 'Greater Noida', 'Mangalore',
  'Kolhapur', 'Amravati', 'Jalgaon', 'Nellore', 'Warangal',
  'Gorakhpur', 'Aligarh', 'Jamshedpur', 'Asansol', 'Siliguri',
  'Bhilai', 'Cuttack', 'Firozabad', 'Kochi', 'Kozhikode',
  'Thrissur', 'Bokaro', 'Durgapur', 'Durg', 'Bilaspur',
  'Guntur', 'Kakinada', 'Rajahmundry', 'Tirupati', 'Anantapur',
  'Udaipur', 'Ajmer', 'Bikaner', 'Alwar', 'Kota',
  'Rohtak', 'Panipat', 'Karnal', 'Ambala', 'Hisar',
  'Patiala', 'Jalandhar', 'Bathinda', 'Mohali',
  'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani',
  'Shimla', 'Dharamsala', 'Solan',

  // Tier 3 — Medium cities, moderate scraping yield
  'Jamnagar', 'Bhavnagar', 'Gandhinagar', 'Anand', 'Bharuch',
  'Navsari', 'Mehsana', 'Morbi', 'Junagadh', 'Gandhidham',
  'Vapi', 'Porbandar', 'Surendranagar', 'Nadiad', 'Ankleshwar',
  'Sangli', 'Satara', 'Latur', 'Akola', 'Dhule',
  'Ahmednagar', 'Chandrapur', 'Yavatmal', 'Wardha', 'Nandurbar',
  'Ratnagiri', 'Bid', 'Parbhani', 'Malegaon',
  'Karimnagar', 'Khammam', 'Nizamabad', 'Nalgonda', 'Kurnool',
  'Kadapa', 'Vizianagaram', 'Eluru', 'Ongole',
  'Howrah', 'Bardhaman', 'Malda', 'Haldia', 'Kharagpur',
  'Muzaffarpur', 'Bhagalpur', 'Gaya', 'Darbhanga', 'Purnia',
  'Hazaribagh', 'Deoghar', 'Giridih',
  'Bhubaneswar', 'Rourkela', 'Berhampur', 'Sambalpur', 'Balasore',
  'Kollam', 'Palakkad', 'Malappuram', 'Alappuzha', 'Kannur', 'Kottayam',
  'Dibrugarh', 'Jorhat', 'Silchar', 'Guwahati',
  'Raipur', 'Korba', 'Rajnandgaon', 'Jagdalpur',
  'Ujjain', 'Rewa', 'Sagar', 'Gwalior', 'Ratlam', 'Dewas',
  'Tumkur', 'Davangere', 'Shimoga', 'Belagavi', 'Ballari',
  'Kalaburagi', 'Raichur', 'Hassan', 'Udupi', 'Dharwad',
  'Salem', 'Erode', 'Vellore', 'Tiruppur', 'Thanjavur',
  'Tirunelveli', 'Dindigul', 'Nagercoil', 'Hosur', 'Kumbakonam',
  'Muzaffarnagar', 'Saharanpur', 'Mathura', 'Jhansi', 'Rampur',
  'Bhilwara', 'Sikar', 'Sri Ganganagar', 'Chittorgarh', 'Bharatpur',
  'Imphal', 'Agartala', 'Shillong', 'Panaji', 'Margao',
  'Puducherry', 'Jammu',

  // Tier 4 — Smaller towns, lower yield but niche leads
  'Amreli', 'Botad', 'Dahod', 'Patan', 'Godhra', 'Palanpur',
  'Veraval', 'Dwarka', 'Deesa', 'Wankaner', 'Gondal',
  'Panvel', 'Ahmednagar',
  'Miryalaguda', 'Suryapet', 'Mahbubnagar', 'Adilabad',
  'Srikakulam', 'Ongole',
  'Raiganj', 'Bankura', 'Purulia', 'Krishnanagar', 'Baharampur',
  'Chhapra', 'Begusarai', 'Katihar', 'Motihari', 'Hajipur',
  'Puri', 'Bhadrak', 'Baripada', 'Jeypore',
  'Rudrapur', 'Kashipur', 'Rishikesh', 'Mussoorie', 'Pithoragarh',
  'Baddi', 'Mandi', 'Kullu', 'Palampur', 'Chamba',
  'Mapusa', 'Ponda', 'Vasco da Gama',
  'Pathankot', 'Moga', 'Firozpur', 'Hoshiarpur', 'Phagwara',
  'Sonipat', 'Yamunanagar', 'Bhiwani', 'Sirsa', 'Rewari',
  'Kurukshetra', 'Panchkula', 'Palwal', 'Jhajjar',
  'Dimapur', 'Kohima', 'Aizawl', 'Itanagar', 'Gangtok',
  'Daman', 'Silvassa', 'Leh', 'Baramulla', 'Anantnag',
]

// Business categories / keywords
export const CATEGORIES = [
  // Food & Beverage
  'restaurant', 'cafe', 'bakery', 'cake shop', 'sweet shop', 'kirana store',
  'dhaba', 'juice bar', 'ice cream parlour', 'fast food', 'tiffin service',
  'cloud kitchen', 'mithai shop', 'chai shop', 'chaat stall', 'biryani house',
  'dry fruits shop', 'spice shop', 'paan shop', 'farsan shop', 'namkeen shop',
  'vada pav stall', 'south indian restaurant', 'chinese restaurant',
  'pizza outlet', 'burger joint', 'food court', 'dabba wala', 'lassi shop',

  // Healthcare & Medical
  'clinic', 'hospital', 'dental clinic', 'pharmacy', 'physiotherapy',
  'ayurvedic clinic', 'homeopathic clinic', 'diagnostic centre',
  'pathology lab', 'blood bank', 'nursing home', 'eye hospital',
  'skin clinic', 'dermatologist', 'orthopaedic clinic', 'paediatric clinic',
  'maternity clinic', 'X-ray centre', 'ultrasound centre', 'dialysis centre',
  'rehabilitation centre', 'ENT specialist', 'cardiology clinic',
  'psychiatric clinic', 'general physician', 'dietician', 'nutritionist',
  'medical equipment store', 'surgical supplies', 'hearing aid centre',

  // Education & Coaching
  'coaching centre', 'tuition', 'school', 'play school', 'preschool',
  'college', 'language classes', 'computer training institute',
  'IIT JEE coaching', 'NEET coaching', 'MBA coaching', 'CA coaching',
  'vocational training', 'art classes', 'drawing classes', 'abacus classes',
  'spoken English institute', 'IELTS coaching', 'personality development',
  'montessori school', 'degree college', 'engineering college',
  'distance education', 'skills training centre',

  // Beauty, Wellness & Fitness
  'salon', 'beauty parlour', 'spa', 'gym', 'fitness center',
  'unisex salon', 'nail art studio', 'threading parlour', 'tattoo studio',
  'mehndi artist', 'ayurvedic spa', 'wellness centre', 'weight loss clinic',
  'slimming centre', 'yoga studio', 'zumba classes', 'crossfit gym',
  'meditation centre', 'naturopathy centre', 'hair transplant clinic',
  'skin care clinic', 'laser clinic',

  // Retail — Clothing & Fashion
  'boutique', 'clothing store', 'saree shop', 'lehenga shop',
  'readymade garments', 'ethnic wear', 'kidswear shop', 'men\'s wear',
  'ladies wear', 'innerwear store', 'sportswear shop',
  'shoes and footwear', 'chappals store', 'handbags store',

  // Retail — Jewellery & Accessories
  'jeweler', 'gold jewellery shop', 'artificial jewellery', 'silver shop',
  'watch shop', 'sunglasses shop',

  // Retail — Electronics & Tech
  'electronics shop', 'mobile shop', 'computer shop', 'laptop store',
  'TV showroom', 'camera shop', 'CCTV dealer', 'DTH service', 'printer shop',
  'gaming accessories', 'smart home devices', 'battery shop',

  // Retail — Home & Lifestyle
  'furniture store', 'interior designer', 'hardware store', 'paint shop',
  'plywood and laminates', 'building materials', 'crockery shop',
  'utensils shop', 'home decor', 'kitchenware', 'mattress store',
  'curtain and blinds', 'modular kitchen showroom', 'bathroom fittings',
  'tiles and marble', 'lighting store',

  // Retail — Other
  'optical store', 'eyewear shop', 'stationery shop', 'book store',
  'toy shop', 'gift shop', 'sports goods', 'luggage shop',
  'supermarket', 'general store', 'organic store', 'baby products store',
  'puja samagri shop', 'cycle shop', 'helmet shop',

  // Photography, Events & Entertainment
  'photographer', 'videographer', 'event planner', 'catering',
  'florist', 'party hall', 'marriage hall', 'wedding planner',
  'DJ services', 'sound system rental', 'tent house',
  'decoration services', 'invitation card printing', 'mehendi service',
  'band service', 'balloon decoration', 'birthday party organiser',
  'drone photography', 'studio rental', 'animation studio',

  // Automotive
  'automobile workshop', 'car repair', 'bike showroom', 'car showroom',
  'car wash', 'tyre shop', 'car accessories', 'driving school',
  'used car dealer', 'auto parts', 'puncture repair', 'EV charging station',
  'electric vehicle dealer', 'car detailing', 'windshield repair',
  'CNG kit fitting', 'truck service centre',

  // Travel, Transport & Hospitality
  'hotel', 'guest house', 'travel agency', 'tours and travels',
  'taxi service', 'homestay', 'service apartment', 'dharamshala',
  'car rental', 'bus booking', 'pilgrimage tour', 'holiday package',
  'cab aggregator', 'auto rental', 'tempo traveller rental',
  'luggage storage', 'visa consultant',

  // Professional & Financial Services
  'lawyer', 'accountant', 'consultant', 'real estate agent', 'property dealer',
  'chartered accountant', 'tax consultant', 'GST consultant',
  'company secretary', 'notary', 'customs agent', 'insurance agent',
  'mutual fund agent', 'stock broker', 'financial planner',
  'loan agent', 'mortgage consultant', 'business consultant',
  'HR consultant', 'recruitment agency', 'manpower agency',
  'immigration consultant', 'property management',

  // Home Services & Repair
  'ac repair', 'plumber', 'electrician', 'carpenter',
  'painter', 'waterproofing', 'pest control', 'packers and movers',
  'home cleaning', 'cook', 'maid service', 'security services',
  'CCTV installation', 'solar panel installer', 'bore well drilling',
  'water purifier service', 'washing machine repair', 'refrigerator repair',
  'TV repair', 'chimney cleaning', 'water tank cleaning', 'false ceiling',

  // Printing, Media & Advertising
  'printing press', 'advertising agency', 'flex printing', 'banner printing',
  'digital marketing agency', 'SEO agency', 'social media agency',
  'web design', 'app development', 'graphic designer', 'content writer',
  'video production', 'radio jockey', 'PR agency', 'sign board maker',
  'branding agency', 'photography studio',

  // Arts, Culture & Hobbies
  'dance school', 'music school', 'art studio', 'pottery class',
  'drama school', 'classical music', 'guitar classes', 'tabla classes',
  'piano classes', 'singing classes', 'theatre group', 'hobby classes',

  // Pets
  'pet shop', 'veterinary clinic', 'dog grooming', 'pet boarding',
  'aquarium shop', 'pet food store',

  // Agriculture & Allied
  'seeds and fertiliser shop', 'agricultural equipment',
  'dairy farm', 'poultry farm', 'fishery', 'nursery and plants',
  'organic farm', 'cold storage', 'agro processing unit',

  // Logistics & Courier
  'courier service', 'cargo service', 'warehousing', 'freight forwarder',
  'last mile delivery', 'e-commerce logistics', 'truck rental',

  // Textile & Garments (B2B)
  'textile shop', 'fabric store', 'embroidery unit', 'tailoring shop',
  'uniform manufacturer', 'export house', 'handloom store',

  // Food Processing & Manufacturing (local)
  'pickle making', 'papad manufacturer', 'spice grinding unit',
  'oil mill', 'flour mill', 'rice mill', 'bakery manufacturing',
  'dairy products', 'ice factory', 'mineral water plant',

  // Finance & Banking
  'bank branch', 'ATM', 'microfinance', 'money transfer', 'forex exchange',
  'pawn broker', 'chit fund', 'credit cooperative',

  // Government & Public
  'post office', 'ration shop', 'common service centre',
  'passport office', 'RTO', 'municipal office',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function cleanName(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').trim()
}

function extractPhone(html: string): string | undefined {
  const m = html.match(/(?:\+91[\s\-]?|0)?[6-9]\d{9}/)
  return m ? m[0].replace(/\s/g, '') : undefined
}

function extractEmail(html: string): string | undefined {
  const match = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  if (match) {
    const e = match[0].toLowerCase()
    // Reject image paths, unicode escapes, and common false positives
    if (e.match(/\.png|.jpg|\.gif|\.svg|\.webp|\.ico|example|no-reply|noreply|sentry|@w3|@schema|domain|u00|u002/i)) return undefined
    // Must have a proper TLD after the @ — not a file extension
    const parts = e.split('@')
    if (parts.length !== 2) return undefined
    const domain = parts[1]
    if (!domain.includes('.') || domain.endsWith('.png') || domain.endsWith('.jpg')) return undefined
    return e
  }
  return undefined
}

function makeFetchHeaders(extra?: Record<string, string>) {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
    ...extra
  }
}

function extractMatches(html: string, patterns: RegExp[], maxPerPattern = 10): string[] {
  const names: string[] = []
  for (const p of patterns) {
    const re = new RegExp(p.source, 'gi')
    let m: RegExpExecArray | null
    let count = 0
    while ((m = re.exec(html)) !== null && count < maxPerPattern) {
      const name = cleanName(m[1] ?? m[0])
      if (name && name.length > 2 && name.length < 100 && !name.includes('http') && !name.includes('www')) {
        names.push(name)
        count++
      }
    }
  }
  return names
}

// ─── Source 1: JustDial ────────────────────────────────────────────────────────────────
// URL: justdial.com/{City}/{Category-slug} e.g. /Vadodara/Restaurants

async function scrapeJustDial(category: string, city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    // JustDial uses Title-Case slugs: "Cake-Shops", "Dental-Clinics"
    const jdSlug = category
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('-')
    const url = `https://www.justdial.com/${city}/${jdSlug}`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    const names = extractMatches(html, [
      /class="store-name"[^>]*>(.*?)<\/[a-z]+>/i,
      /data-name="([^"]{3,80})"/,
      /"fn"[^>]*>([^<]{3,80})</,
      /class="resultbox_title_anchor[^"]*"[^>]*>(.*?)<\/a>/i,
    ])

    const phones = html.match(/(?:\+91[\s\-]?|0)?[6-9]\d{9}/g) ?? []
    
    // Attempt basic email extraction from JustDial HTML
    const email = extractEmail(html);

    names.forEach((name, i) => {
      leads.push({
        business_name: name,
        phone: phones[i]?.replace(/\s/g, ''),
        email: email,
        city, category,
        has_website: false,
        source: 'JustDial',
        source_url: url,
        score_bonus: 3
      })
    })
  } catch (err) {
    console.error(`[JustDial] ${city}/${category}: ${String(err)}`)
  }
  return leads
}

// ─── Source 2: IndiaMART ────────────────────────────────────────────────────────────────
// URL: indiamart.com/{category}-manufacturers/?cityname={city}

async function scrapeIndiaMART(category: string, city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    const url = `https://www.indiamart.com/${slugify(category)}-manufacturers/?cityname=${encodeURIComponent(city)}`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    const names = extractMatches(html, [
      /class="company-name"[^>]*>(.*?)<\/[a-z]+>/i,
      /class="prod-name"[^>]*>(.*?)<\/[a-z]+>/i,
      /"companyName"\s*:\s*"([^"]{3,80})"/,
    ])

    const email = extractEmail(html);

    names.forEach(name => {
      leads.push({ business_name: name, email, city, category, has_website: false, source: 'IndiaMART', source_url: url, score_bonus: 3 })
    })
  } catch (err) {
    console.error(`[IndiaMART] ${city}/${category}: ${String(err)}`)
  }
  return leads
}

// ─── Source 3: Sulekha ────────────────────────────────────────────────────────

async function scrapeSulekha(category: string, city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    const url = `https://www.sulekha.com/${slugify(category)}-in-${slugify(city)}`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    const names = extractMatches(html, [
      /class="bname"[^>]*>(.*?)<\/[a-z]+>/i,
      /class="listing-title"[^>]*>(.*?)<\/[a-z]+>/i,
    ])

    const email = extractEmail(html);

    names.forEach(name => {
      leads.push({ business_name: name, email, city, category, has_website: false, source: 'Sulekha', source_url: url, score_bonus: 2 })
    })
  } catch (err) {
    console.error(`[Sulekha] ${city}/${category}: ${String(err)}`)
  }
  return leads
}

// ─── Source 4: YellowPages India ──────────────────────────────────────────────────────────
// URL: yellowpages.in/{city}/{category}

async function scrapeYellowPages(category: string, city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    const url = `https://www.yellowpages.in/${slugify(city)}/${slugify(category)}`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    const names = extractMatches(html, [
      /class="listing-name"[^>]*>(.*?)<\/[a-z]+>/i,
      /class="bname"[^>]*>(.*?)<\/[a-z]+>/i,
      /"businessName"\s*:\s*"([^"]{3,80})"/,
    ])

    const email = extractEmail(html);

    names.forEach(name => {
      leads.push({ business_name: name, email, city, category, has_website: false, source: 'YellowPages', source_url: url, score_bonus: 1 })
    })
  } catch (err) {
    console.error(`[YellowPages] ${city}/${category}: ${String(err)}`)
  }
  return leads
}

// ─── Source 5: Locanto ────────────────────────────────────────────────────────

async function scrapeLocanto(category: string, city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    const url = `https://www.locanto.in/${slugify(city)}/${slugify(category)}/`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    const names = extractMatches(html, [
      /class="item-title"[^>]*>(.*?)<\/[a-z]+>/i,
      /class="[^"]*title[^"]*"[^>]*>(.*?)<\/[a-z]+>/i,
    ])

    names.forEach(name => {
      leads.push({ business_name: name, city, category, has_website: false, source: 'Locanto', source_url: url, score_bonus: 2 })
    })
  } catch (err) {
    console.error(`[Locanto] ${city}/${category}: ${String(err)}`)
  }
  return leads
}

// ─── Source 6: OLX ────────────────────────────────────────────────────────────

async function scrapeOLX(category: string, city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    const url = `https://www.olx.in/${slugify(city)}/q-${slugify(category)}`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    const names = extractMatches(html, [
      /data-aut-id="itemTitle"[^>]*>(.*?)<\/[a-z]+>/i,
      /"_title"[^>]*>(.*?)<\/[a-z]+>/i,
    ])

    names.forEach(name => {
      leads.push({ business_name: name, city, category, has_website: false, source: 'OLX', source_url: url, score_bonus: 1 })
    })
  } catch (err) {
    console.error(`[OLX] ${city}/${category}: ${String(err)}`)
  }
  return leads
}

// ─── Source 7: TradeIndia ─────────────────────────────────────────────────────

async function scrapeTradeIndia(category: string, city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    const url = `https://www.tradeindia.com/${slugify(category)}/city-${slugify(city)}.html`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    const names = extractMatches(html, [
      /class="company-name"[^>]*>(.*?)<\/[a-z]+>/i,
      /class="co_name"[^>]*>(.*?)<\/[a-z]+>/i,
      /class="listing-name"[^>]*>(.*?)<\/[a-z]+>/i,
    ])

    const email = extractEmail(html);

    names.forEach(name => {
      leads.push({ business_name: name, email, city, category, has_website: false, source: 'TradeIndia', source_url: url, score_bonus: 3 })
    })
  } catch (err) {
    console.error(`[TradeIndia] ${city}/${category}: ${String(err)}`)
  }
  return leads
}

// ─── Source 8: Quikr ──────────────────────────────────────────────────────────

async function scrapeQuikr(category: string, city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    const url = `https://www.quikr.com/jobs/search?q=${encodeURIComponent(category)}&location=${encodeURIComponent(city)}`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    const names = extractMatches(html, [
      /class="[^"]*company[^"]*"[^>]*>(.*?)<\/[a-z]+>/i,
      /class="[^"]*title[^"]*"[^>]*>(.*?)<\/[a-z]+>/i,
    ])

    const email = extractEmail(html);

    names.forEach(name => {
      leads.push({ business_name: name, email, city, category, has_website: false, source: 'Quikr', source_url: url, score_bonus: 2 })
    })
  } catch (err) {
    console.error(`[Quikr] ${city}/${category}: ${String(err)}`)
  }
  return leads
}

// ─── Source 9: ExportersIndia ─────────────────────────────────────────────────

async function scrapeExportersIndia(category: string, city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    const url = `https://www.exportersindia.com/${slugify(category)}-manufacturers-exporters-india/${slugify(city)}.htm`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    const names = extractMatches(html, [
      /class="company-name"[^>]*>(.*?)<\/[a-z]+>/i,
      /class="cmpName"[^>]*>(.*?)<\/[a-z]+>/i,
    ])

    const email = extractEmail(html);

    names.forEach(name => {
      leads.push({ business_name: name, email, city, category, has_website: false, source: 'ExportersIndia', source_url: url, score_bonus: 3 })
    })
  } catch (err) {
    console.error(`[ExportersIndia] ${city}/${category}: ${String(err)}`)
  }
  return leads
}

// ─── Source 10: Overpass API (OpenStreetMap) — FULLY FREE, NO KEY ─────────────
// Returns real business data with phone, website, lat/lng — 100% free forever

async function scrapeOverpass(category: string, city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []

  // Map common categories to OSM amenity/shop tags
  const osmTagMap: Record<string, string[]> = {
    restaurant:     ['amenity=restaurant', 'amenity=fast_food'],
    cafe:           ['amenity=cafe'],
    bakery:         ['shop=bakery'],
    clinic:         ['amenity=clinic', 'amenity=doctors'],
    hospital:       ['amenity=hospital'],
    pharmacy:       ['amenity=pharmacy'],
    school:         ['amenity=school'],
    gym:            ['leisure=fitness_centre'],
    salon:          ['shop=hairdresser', 'shop=beauty'],
    hotel:          ['tourism=hotel', 'tourism=guest_house'],
    dentist:        ['amenity=dentist'],
    veterinary:     ['amenity=veterinary'],
    jeweler:        ['shop=jewelry'],
    'optical store':['shop=optician'],
    photographer:   ['shop=photo'],
    laundry:        ['shop=laundry'],
    supermarket:    ['shop=supermarket'],
    electronics:    ['shop=electronics'],
    furniture:      ['shop=furniture'],
    yoga:           ['sport=yoga'],
  }

  // Find best matching OSM tag
  const catLower = category.toLowerCase()
  let tags: string[] = []
  for (const [key, val] of Object.entries(osmTagMap)) {
    if (catLower.includes(key)) { tags = val; break }
  }
  if (!tags.length) return leads // no OSM match for this category

  try {
    const tagQuery = tags.map(t => {
      const [k, v] = t.split('=')
      return `node["${k}"="${v}"](area.searchArea);way["${k}"="${v}"](area.searchArea);`
    }).join('\n')

    const query = `
      [out:json][timeout:10];
      area["name"="${city}"]["place"~"city|town|village"]->.searchArea;
      (
        ${tagQuery}
      );
      out body 15;
    `

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(12000)
    })

    if (!res.ok) return leads
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('json') && !contentType.includes('text/plain')) return leads

    const json = await res.json() as { elements?: Array<{ tags?: Record<string, string> }> }

    for (const el of json.elements ?? []) {
      const t = el.tags ?? {}
      const name = t['name'] || t['name:en']
      if (!name) continue

      const phone = t['phone'] || t['contact:phone'] || t['mobile']
      const website = t['website'] || t['contact:website'] || t['url']
      const email = t['email'] || t['contact:email'] || undefined
      const hasWebsite = !!website

      leads.push({
        business_name: name,
        phone: phone?.replace(/[\s\-\(\)]/g, ''),
        email,
        city,
        category,
        has_website: hasWebsite,
        current_website: hasWebsite ? website : undefined,
        source: 'OpenStreetMap',
        score_bonus: hasWebsite ? 0 : 4,
        source_data: { lat: (el as any).lat, lon: (el as any).lon, osm_tags: t }
      })
    }
  } catch (err) {
    console.error(`[Overpass] ${city}/${category}: ${String(err)}`)
  }
  return leads
}

// ─── Source 11: Zomato public restaurant listings ─────────────────────────────

async function scrapeZomato(city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    const citySlug = city.toLowerCase()
    const url = `https://www.zomato.com/${citySlug}`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    // Extract restaurant names from JSON-LD or page data
    const jsonLdMatches = html.match(/"name"\s*:\s*"([^"]{3,80})"/g) ?? []
    const names = jsonLdMatches
      .map(m => m.replace(/"name"\s*:\s*"/, '').replace(/"$/, '').trim())
      .filter(n => n.length > 3 && !n.includes('\\') && !n.includes('http') && !['Zomato', 'Home', 'India', 'Restaurants', 'Dining', 'Delivery', 'Nightlife', 'Takeaway'].includes(n) && !n.endsWith(' Restaurants'))
      .filter(n => n !== city && n !== `${city} Restaurants`)
      .slice(0, 10)

    const email = extractEmail(html)

    names.forEach(name => {
      leads.push({ business_name: name, email, city, category: 'restaurant', has_website: false, source: 'Zomato', source_url: url, score_bonus: 3 })
    })
  } catch (err) {
    console.error(`[Zomato] ${city}: ${String(err)}`)
  }
  return leads
}

// ─── Source 12: Practo public doctor/clinic listings ─────────────────────────

async function scrapePracto(city: string): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = []
  try {
    const url = `https://www.practo.com/${slugify(city)}/doctors`
    const res = await fetch(url, { headers: makeFetchHeaders(), signal: AbortSignal.timeout(8000) })
    const html = await res.text()

    const names = extractMatches(html, [
      /class="[^"]*doctor-name[^"]*"[^>]*>(.*?)<\/[a-z]+>/i,
      /class="[^"]*info-section[^"]*"[^>]*>.*?<p[^>]*>(.*?)<\/p>/i,
    ])

    const email = extractEmail(html)

    names.forEach(name => {
      leads.push({ business_name: name, email, city, category: 'clinic', has_website: false, source: 'Practo', source_url: url, score_bonus: 3 })
    })
  } catch (err) {
    console.error(`[Practo] ${city}: ${String(err)}`)
  }
  return leads
}

// ─── Source 13: Multi-Engine Email Discovery ──────────────────────────────────
// Searches DuckDuckGo + Bing (both free, no API key) for business emails.
// This bypasses Cloudflare-protected directories by searching the open web.
// Anti-rate-limit: rotating UAs, random delays, sequential with jitter.

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
]

function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] }
function randomDelay(min: number, max: number) { return new Promise(r => setTimeout(r, min + Math.random() * (max - min))) }

function filterValidEmail(raw: string): string | undefined {
  const e = raw.toLowerCase()
  if (e.match(/\.png|\.jpg|\.gif|\.svg|\.webp|\.ico|\.css|\.js|example|noreply|no-reply|sentry|@w3|@schema|@duckduckgo|@duck\.com|@bing|@microsoft|@google|@gstatic|u00|u002|@wikipedia|@wikimedia|placeholder|test@|unsubscribe|error-lite/i)) return undefined
  const parts = e.split('@')
  if (parts.length !== 2) return undefined
  const domain = parts[1]
  if (!domain.includes('.') || domain.endsWith('.png') || domain.endsWith('.jpg')) return undefined
  return e
}

export async function searchEmailViaDDG(businessName: string, city: string): Promise<string | undefined> {
  const q = `"${businessName}" ${city} email contact @gmail.com`
  try {
    // Random jitter before hitting DDG (2-5 seconds)
    await randomDelay(2000, 5000)

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(4000)
    })

    // 202 = rate limited, skip
    if (res.status === 202 || !res.ok) return undefined
    const html = await res.text()

    const emailMatches = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
    if (emailMatches) {
      for (const raw of emailMatches) {
        const valid = filterValidEmail(raw)
        if (valid) return valid
      }
    }
  } catch { /* DDG failed */ }
  return undefined
}

export async function searchEmailViaBing(businessName: string, city: string): Promise<string | undefined> {
  const q = `"${businessName}" ${city} email contact`
  try {
    await randomDelay(1000, 3000)

    const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&cc=in&setlang=en`
    const res = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) return undefined
    const html = await res.text()

    const emailMatches = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
    if (emailMatches) {
      for (const raw of emailMatches) {
        const valid = filterValidEmail(raw)
        if (valid) return valid
      }
    }
  } catch { /* Bing failed */ }
  return undefined
}

// ─── Source 14: Deep Website Crawler ──────────────────────────────────────────
// When a business has a website, crawl multiple pages for contact info.
// Hits: /, /contact, /contact-us, /about, /about-us — extracts email + phone.

async function deepCrawlWebsite(websiteUrl: string): Promise<{ email?: string; phone?: string }> {
  const result: { email?: string; phone?: string } = {}
  const base = websiteUrl.replace(/\/$/, '').replace(/^http:/, 'https:')
  const pagesToTry = [
    base,
    `${base}/contact`,
    `${base}/contact-us`,
    `${base}/contactus`,
    `${base}/about`,
    `${base}/about-us`,
    `${base}/reach-us`,
  ]

  for (const url of pagesToTry) {
    try {
      const res = await fetch(url, {
        headers: { ...makeFetchHeaders(), 'User-Agent': randomUA() },
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      })
      if (!res.ok) continue
      const html = await res.text()

      if (!result.email) {
        const emailMatches = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
        if (emailMatches) {
          for (const raw of emailMatches) {
            const valid = filterValidEmail(raw)
            if (valid) { result.email = valid; break }
          }
        }
      }

      if (!result.phone) {
        const phoneMatch = html.match(/(?:\+91[\s\-]?|0)?[6-9]\d{9}/)
        if (phoneMatch) result.phone = phoneMatch[0].replace(/\s/g, '')
      }

      if (result.email && result.phone) break
    } catch { /* try next page */ }
  }
  return result
}

// ─── scrapeCombo: scrape one city x category pair across all sources ──────────
// Used by bizdev.mts cursor rotation. All sources run in parallel, then
// Phase 2 enriches missing emails SEQUENTIALLY with random delays.

export async function scrapeCombo(city: string, category: string): Promise<ScrapedLead[]> {
  const catLower = category.toLowerCase()

  // Run all relevant sources in parallel
  const tasks: Promise<ScrapedLead[]>[] = [
    scrapeJustDial(category, city),
    scrapeIndiaMART(category, city),
    scrapeSulekha(category, city),
    scrapeYellowPages(category, city),
    scrapeTradeIndia(category, city),
    scrapeOverpass(category, city),
  ]

  // Add category-specific sources
  if (catLower.includes('restaurant') || catLower.includes('cafe') || catLower.includes('food')) {
    tasks.push(scrapeZomato(city))
  }
  if (catLower.includes('clinic') || catLower.includes('doctor') || catLower.includes('dental') || catLower.includes('physio')) {
    tasks.push(scrapePracto(city))
  }
  if (catLower.includes('manufacturer') || catLower.includes('exporter') || catLower.includes('dealer')) {
    tasks.push(scrapeExportersIndia(category, city))
  }
  if (catLower.includes('sale') || catLower.includes('shop') || catLower.includes('store')) {
    tasks.push(scrapeOLX(category, city))
    tasks.push(scrapeQuikr(category, city))
  }

  const results = await Promise.allSettled(tasks)
  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  // Deduplicate within this combo — merge email/phone across sources for same business
  const seen = new Map<string, ScrapedLead>()
  for (const lead of all) {
    const key = lead.business_name.toLowerCase().trim()
    if (!key) continue
    if (!seen.has(key)) {
      seen.set(key, { ...lead })
    } else {
      const existing = seen.get(key)!
      if (!existing.email && lead.email) existing.email = lead.email
      if (!existing.phone && lead.phone) existing.phone = lead.phone
      if (!existing.current_website && lead.current_website) existing.current_website = lead.current_website
    }
  }

  const deduped = Array.from(seen.values())

  // ── Phase 2: Email enrichment — SEQUENTIAL with random delays ──────────────
  // For leads still missing email, try: website crawl -> DDG -> Bing
  // Process up to 3 leads to stay within serverless time budget.
  // Run ONE AT A TIME with random pauses to avoid rate limits.
  const needsEmail = deduped.filter(l => !l.email).slice(0, 3)

  for (const lead of needsEmail) {
    // Strategy 1: Deep crawl their website
    if (lead.current_website) {
      try {
        const crawled = await deepCrawlWebsite(lead.current_website)
        if (crawled.email) { lead.email = crawled.email; continue }
        if (crawled.phone && !lead.phone) lead.phone = crawled.phone
      } catch { /* continue to search engines */ }
    }

    // Strategy 2: DuckDuckGo (with built-in random delay)
    try {
      const ddgEmail = await searchEmailViaDDG(lead.business_name, city)
      if (ddgEmail) { lead.email = ddgEmail; continue }
    } catch { /* try Bing */ }

    // Strategy 3: Bing (with built-in random delay)
    try {
      const bingEmail = await searchEmailViaBing(lead.business_name, city)
      if (bingEmail) { lead.email = bingEmail; continue }
    } catch { /* no luck from any engine */ }
  }

  return deduped
}

// ─── scrapeFreeSources: legacy bulk scraper (kept for backwards compat) ───────

export async function scrapeFreeSources(
  cities: string[] = CITIES,
  categories: string[] = CATEGORIES
): Promise<ScrapedLead[]> {
  // Delegate to cursor-safe scrapeCombo for a small random subset
  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)
  const selectedCities     = shuffle(cities).slice(0, 2)
  const selectedCategories = shuffle(categories).slice(0, 2)

  const results = await Promise.all(
    selectedCities.flatMap(city =>
      selectedCategories.map(category => scrapeCombo(city, category).catch(() => [] as ScrapedLead[]))
    )
  )

  const allLeads = results.flat()
  const seen = new Set<string>()
  return allLeads.filter(l => {
    const key = l.business_name.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
