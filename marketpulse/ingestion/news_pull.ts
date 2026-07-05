import "dotenv/config";
import { pathToFileURL } from "node:url";
import Parser from "rss-parser";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getSupabaseClient } from "../db/supabase_client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type FeedConfig = { source: string; url: string };

function loadFeeds(): FeedConfig[] {
  const raw = readFileSync(path.join(__dirname, "..", "config", "rss_feeds.json"), "utf-8");
  return JSON.parse(raw);
}

export async function pullNews(): Promise<{ inserted: number; skipped: number; failedFeeds: string[] }> {
  const supabase = getSupabaseClient();
  const parser = new Parser({ timeout: 15000 });
  const feeds = loadFeeds();

  let inserted = 0;
  let skipped = 0;
  const failedFeeds: string[] = [];

  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = parsed.items ?? [];

      for (const item of items) {
        const link = item.link?.trim();
        const title = item.title?.trim();
        if (!link || !title) continue;

        const { error } = await supabase.from("news_articles").insert({
          source: feed.source,
          title,
          link,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          raw_summary: (item.contentSnippet ?? item.content ?? "").slice(0, 2000),
        });

        if (error) {
          // Unique violation on `link` just means we've already ingested this
          // article on a previous run — that's the expected steady state, not
          // a failure.
          if (error.code === "23505") skipped++;
          else throw error;
        } else {
          inserted++;
        }
      }
      console.log(`[news_pull] ${feed.source}: ${items.length} items seen`);
    } catch (err) {
      console.warn(`[news_pull] ${feed.source} failed:`, err instanceof Error ? err.message : err);
      failedFeeds.push(feed.source);
    }
  }

  console.log(`[news_pull] done — inserted ${inserted}, skipped ${skipped} duplicates, ${failedFeeds.length} feeds failed`);
  return { inserted, skipped, failedFeeds };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  pullNews().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
