/**
 * Market Tracker Agent — Every 6 hours
 * Fetches comprehensive real-time financial/market news and market-moving events
 * Sends to founder only if significant events are found
 */

import type { Config } from '@netlify/functions';
import { callAI } from '../../src/lib/ai/router';
import { notifyFounder } from '../../src/lib/email/client';
import { getServiceSupabase } from '../../src/lib/supabase';
import { requireInternalAuth } from './internal-auth';

interface MarketNews {
  headline: string;
  source: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  timestamp?: string;
}

async function fetchMarketNews(): Promise<MarketNews[]> {
  const news: MarketNews[] = [];
  
  const searchQueries = [
    { q: 'breaking financial news stock market today', category: 'Markets', impact: 'high' },
    { q: 'Nifty Sensex BSE stock market today live', category: 'Indian Markets', impact: 'high' },
    { q: 'US stock market Dow Jones Nasdaq S&P500 today', category: 'US Markets', impact: 'high' },
    { q: 'crude oil price brent WTI today', category: 'Oil & Energy', impact: 'high' },
    { q: 'USD INR exchange rate forex today', category: 'Forex', impact: 'high' },
    { q: 'gold silver commodity price today', category: 'Commodities', impact: 'high' },
    { q: 'RBI interest rate repo rate decision today', category: 'RBI/Policy', impact: 'high' },
    { q: 'India GDP inflation CPI economic news', category: 'India Economy', impact: 'high' },
    { q: 'India trade deficit exports imports news', category: 'Trade', impact: 'medium' },
    { q: 'India budget tax policy government news', category: 'Policy', impact: 'high' },
    { q: 'Fed interest rate decision US economy news', category: 'US Economy', impact: 'high' },
    { q: 'China economy GDP data news', category: 'China Economy', impact: 'high' },
    { q: 'war conflict geopolitical tension latest', category: 'Geopolitics', impact: 'high' },
    { q: 'Russia Ukraine war oil prices impact', category: 'Geopolitics', impact: 'high' },
    { q: 'Middle East conflict oil supply news', category: 'Geopolitics', impact: 'high' },
    { q: 'global recession economic warning IMF World Bank', category: 'Global Economy', impact: 'high' },
    { q: 'IT sector TCS Infosys Wipro stock news', category: 'IT Sector', impact: 'medium' },
    { q: 'banking sector HDFC SBI ICICI news', category: 'Banking Sector', impact: 'medium' },
    { q: 'auto sector Maruti Tata Motors EV news', category: 'Auto Sector', impact: 'medium' },
    { q: 'pharma sector Sun Pharma Dr Reddy news', category: 'Pharma Sector', impact: 'medium' },
    { q: 'bitcoin BTC ethereum crypto price today', category: 'Crypto', impact: 'medium' },
    { q: 'cryptocurrency regulation news blockchain', category: 'Crypto', impact: 'medium' },
    { q: 'startup funding investment India 2024 2025', category: 'Startup/Funding', impact: 'medium' },
    { q: 'M&A acquisition merger corporate news', category: 'Corporate', impact: 'medium' },
    { q: 'layoffs job cuts recession corporate news', category: 'Corporate', impact: 'medium' },
    { q: 'real estate housing market India news', category: 'Real Estate', impact: 'medium' },
    { q: 'infrastructure construction project India news', category: 'Infrastructure', impact: 'medium' },
    { q: 'earthquake natural disaster economic impact', category: 'Natural Events', impact: 'high' },
    { q: 'pandemic disease outbreak economic impact', category: 'Health Events', impact: 'high' },
    { q: 'election results economic policy impact', category: 'Political', impact: 'high' },
    { q: 'sanctions trade embargo economic news', category: 'Sanctions', impact: 'high' },
    { q: 'semiconductor chip shortage supply chain news', category: 'Tech Supply Chain', impact: 'medium' },
    { q: 'FII DII foreign institutional investor India flow', category: 'FII/DII Flows', impact: 'high' },
    { q: 'foreign investment India equity market', category: 'FII/DII Flows', impact: 'high' },
  ];

  for (const search of searchQueries) {
    try {
      const url = `https://html.duckduckgo.com/html?q=${encodeURIComponent(search.q)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        },
        signal: AbortSignal.timeout(6000)
      });
      
      if (!res.ok) continue;
      
      const html = await res.text();
      const resultBlocks = html.split('<a class="result__a"');
      
      for (let i = 1; i < Math.min(resultBlocks.length, 3); i++) {
        const match = resultBlocks[i].match(/>([^<]{30,200})</);
        if (match && match[1]) {
          const headline = match[1].trim();
          if (headline.length > 20 && !news.some(n => n.headline.includes(headline.slice(0, 50)))) {
            news.push({
              headline,
              source: search.category,
              impact: search.impact,
              category: search.category
            });
          }
        }
      }
    } catch (err) {
      console.error(`[MarketTracker] Search failed for ${search.category}:`, err);
    }
  }
  
  return news;
}

async function analyzeAndCategorize(news: MarketNews[]): Promise<{
  highImpact: MarketNews[];
  mediumImpact: MarketNews[];
  summary: string;
  keyInsights: string[];
  hasSignificantEvents: boolean;
}> {
  const noisePatterns = ['advertisement', 'sponsored', 'click here', 'subscribe now', 'free download'];
  const filteredNews = news.filter(n => {
    const lower = n.headline.toLowerCase();
    return !noisePatterns.some(p => lower.includes(p)) && n.headline.length > 40;
  });
  
  const highImpact = filteredNews.filter(n => n.impact === 'high').slice(0, 8);
  const mediumImpact = filteredNews.filter(n => n.impact === 'medium').slice(0, 8);
  
  const categories = [...new Set(filteredNews.map(n => n.category))];
  
  const hasSignificantEvents = highImpact.length >= 2 || (highImpact.length >= 1 && mediumImpact.length >= 2);
  
  if (!hasSignificantEvents) {
    return {
      highImpact: [],
      mediumImpact: [],
      summary: 'No significant market events detected.',
      keyInsights: [],
      hasSignificantEvents: false
    };
  }
  
  const analysis = await callAI(
    `You are a senior financial analyst. Analyze these market news items and provide:
1. Key market-moving events (max 5)
2. Impact on Indian markets specifically
3. Any immediate opportunities or risks
4. Brief market outlook

Reply with structured JSON:
{
  "key_events": ["list of 3-5 most important events with brief context"],
  "india_impact": "2-3 sentence impact analysis on Indian markets",
  "opportunities_risks": "brief note on opportunities and risks",
  "outlook": "1-2 sentence market outlook",
  "urgency": "normal" or "alert" depending on severity
}`,
    JSON.stringify({ 
      total_news: filteredNews.length,
      categories: categories,
      high_impact: highImpact.slice(0, 10),
      all_news: filteredNews.slice(0, 20)
    }),
    500,
    'research'
  );
  
  let parsed: any = {};
  try {
    parsed = JSON.parse(analysis);
  } catch { /* use defaults */ }
  
  return {
    highImpact,
    mediumImpact,
    summary: parsed.key_events?.join('\n') || 'Market analysis in progress',
    keyInsights: [
      parsed.india_impact || '',
      parsed.opportunities_risks || '',
      parsed.outlook || ''
    ].filter(Boolean),
    hasSignificantEvents: true
  };
}

export default async () => {
  const supabase = getServiceSupabase();
  
  try {
    console.log('[MarketTracker] Fetching comprehensive market news...');
    
    const news = await fetchMarketNews();
    console.log(`[MarketTracker] Found ${news.length} news items`);
    
    const { highImpact, mediumImpact, summary, keyInsights, hasSignificantEvents } = await analyzeAndCategorize(news);
    
     if (!hasSignificantEvents) {
       console.log('[MarketTracker] No significant events found');
       await supabase.from('agent_logs').insert({
         agent_name: 'market_tracker',
         action: 'market_scan',
         details: { news_count: news.length, result: 'no_significant_events' }
       });
       return new Response(JSON.stringify({ ok: true, message: 'No significant events' }), { status: 200 });
     }

     const message = `📊 *Market Update*\n\n${summary}\n\n${keyInsights.map(i => `• ${i}`).join('\n')}`;
     await notifyFounder('Market Tracker Alert', message);

     await supabase.from('agent_logs').insert({
       agent_name: 'market_tracker',
       action: 'market_alert_sent',
       details: { high_count: highImpact.length, medium_count: mediumImpact.length }
     });

     return new Response(JSON.stringify({ ok: true, high: highImpact.length, medium: mediumImpact.length }), { status: 200 });
   } catch (err: any) {
     console.error('[MarketTracker] Error:', err);
     return new Response(JSON.stringify({ error: err.message }), { status: 500 });
   }
};

export const config: Config = { schedule: '0 */6 * * *' };
