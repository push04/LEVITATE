import { scrapeCombo } from './src/lib/scrapers/free-sources';

async function testBizDev() {
  console.log('Testing BizDev Agent Scraper...');
  const city = 'Vadodara';
  const category = 'restaurant';
  console.log('Running combo:', { city, category });
  
  try {
    const leads = await scrapeCombo(city, category);
    console.log('Results scraped:', leads.length);
    
    if (leads.length > 0) {
      console.log('Sample Lead:');
      console.log(leads[0]);
    } else {
      console.error('No leads found! Scraper may be blocked or broken.');
    }
  } catch (err) {
    console.error('Test run failed:', err);
  }
}

testBizDev().catch(console.error);
