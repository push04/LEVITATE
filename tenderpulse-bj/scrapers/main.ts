// Fully-automatic entrypoint: crawl all sources, sleep, repeat forever.
// This is what RUN_TENDERPULSE.bat launches — leave it running on the local
// PC and it keeps polling without further interaction (per tenderbot.md
// Section 3: "Local PC, always-on... acts as the server for scheduled jobs").
import { runAllSources } from "./scheduler.js";

const INTERVAL_MINUTES = Number(process.env.CRAWL_INTERVAL_MINUTES || 30);

async function loop() {
  for (;;) {
    try {
      await runAllSources();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Crawl cycle crashed:`, err);
    }
    console.log(`[${new Date().toISOString()}] Sleeping ${INTERVAL_MINUTES} minutes until next crawl...`);
    await new Promise((r) => setTimeout(r, INTERVAL_MINUTES * 60_000));
  }
}

loop();
