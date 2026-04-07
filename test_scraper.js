const { search, SafeSearchType } = require('duck-duck-scrape');

async function testScraper() {
    console.log("Starting test...");
    const query = "Real Estate Agents in New York";

    try {
        console.log("Attempting duck-duck-scrape...");
        const searchResults = await search(query, {
            safeSearch: SafeSearchType.OFF,
        });
        console.log("Success! Results found:", searchResults.results.length);
        console.log("First result:", searchResults.results[0]);
    } catch (error) {
        console.error("duck-duck-scrape failed:", error.message);

        console.log("Attempting fallback fetch...");
        try {
            const fallbackResponse = await fetch(`https://html.duckduckgo.com/html?q=${encodeURIComponent(query)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });

            console.log("Fallback Status:", fallbackResponse.status);
            const html = await fallbackResponse.text();
            console.log("Fallback HTML length:", html.length);
        } catch (fallbackError) {
            console.error("Fallback failed:", fallbackError.message);
        }
    }
}

testScraper();
