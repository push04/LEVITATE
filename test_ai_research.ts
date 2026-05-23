import { callAI } from './src/lib/ai/router';

// Load env locally
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testAIQuery() {
  const lead = {
    business_name: 'Bhavani Traders',
    category: 'electronics shop',
    city: 'Ahmedabad',
    has_website: false
  };

  console.log(`[Research] Enriching lead:`, lead);
  
  const research = await callAI(
    `You are a market research analyst for a web development agency in India.
Research and enrich this lead. Return JSON with:
- priority_score: 1-10, how urgently do they need a website
- estimated_project_value: conservative estimate in INR
- website_recommendations: 2-3 key things
- tags: array of 3-5 tags
- deduced_email: A highly probable professional email for them (e.g. bhavanitraders@gmail.com). Return null if totally impossible.

Reply with valid JSON only.`,
    JSON.stringify(lead),
    400,
    'research'
  );
  
  console.log('AI Response:', research);
}

testAIQuery();
