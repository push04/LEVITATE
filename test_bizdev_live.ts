import { scrapeCombo } from './src/lib/scrapers/free-sources';

async function runTests() {
  const testCases = [
    { city: 'Mumbai', category: 'boutique' },
    { city: 'Pune', category: 'doctor' },
    { city: 'Ahmedabad', category: 'cafe' },
    { city: 'Delhi', category: 'dentist' },
    { city: 'Bangalore', category: 'gym' }
  ];

  console.log('--- STARTING 5 LIVE BIZDEV SCRAPES ---');
  
  for (let i = 0; i < testCases.length; i++) {
    const { city, category } = testCases[i];
    console.log(`\n\n[TEST ${i + 1}/5] Scraping ${category} in ${city}...`);
    try {
      const results = await scrapeCombo(city, category);
      
      const validLeads = results.filter(r => r.business_name && r.business_name.length > 2);
      console.log(`✅ SUCCESS: Found ${validLeads.length} live leads.`);
      
      if (validLeads.length > 0) {
          // Print up to 3 to verify
          validLeads.slice(0, 3).forEach((lead, idx) => {
             console.log(`   -> Lead ${idx + 1}: ${lead.business_name}`);
             if (lead.phone) console.log(`      Phone: ${lead.phone}`);
             if (lead.website) console.log(`      Website: ${lead.website}`);
             console.log(`      Source: ${lead.source}`);
          });
      }
    } catch (err) {
      console.error(`❌ FAILED Test ${i + 1}:`, err);
    }
  }
  console.log('\n--- ALL 5 BIZDEV TESTS COMPLETED ---');
}

runTests();
