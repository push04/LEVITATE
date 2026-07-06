import "dotenv/config";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getSupabaseClient } from "../db/supabase_client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type SubredditConfig = { name: string };

function loadSubreddits(): SubredditConfig[] {
  const raw = readFileSync(path.join(__dirname, "..", "config", "subreddits.json"), "utf-8");
  return JSON.parse(raw);
}

// Official Reddit OAuth REST API - the same authenticated endpoint the
// Python PRAW library wraps. Implemented directly here (rather than pulling
// in a Python dependency) to stay consistent with the rest of this project,
// which is TypeScript end to end. "Script app" client-credentials grant is
// sufficient for read-only public post access - no user login needed.
async function getAccessToken(clientId: string, clientSecret: string, userAgent: string): Promise<string> {
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Reddit OAuth failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("Reddit OAuth response had no access_token");
  return data.access_token as string;
}

type RedditPost = {
  id: string;
  subreddit: string;
  title: string;
  selftext: string | null;
  score: number;
  upvote_ratio: number | null;
  num_comments: number;
  permalink: string | null;
  flair: string | null;
  created_utc: string | null;
};

async function fetchSubredditPosts(token: string, userAgent: string, subreddit: string, limit = 25): Promise<RedditPost[]> {
  const res = await fetch(`https://oauth.reddit.com/r/${encodeURIComponent(subreddit)}/new?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": userAgent },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const children: Array<{ data: Record<string, unknown> }> = data.data?.children ?? [];

  return children.map(({ data: p }) => ({
    id: p.name as string, // Reddit's fullname (e.g. "t3_abc123") - globally unique, doubles as our primary key
    subreddit,
    title: (p.title as string) ?? "",
    selftext: typeof p.selftext === "string" && p.selftext.length > 0 ? p.selftext.slice(0, 4000) : null,
    score: typeof p.score === "number" ? p.score : 0,
    upvote_ratio: typeof p.upvote_ratio === "number" ? p.upvote_ratio : null,
    num_comments: typeof p.num_comments === "number" ? p.num_comments : 0,
    permalink: typeof p.permalink === "string" ? `https://reddit.com${p.permalink}` : null,
    flair: typeof p.link_flair_text === "string" ? p.link_flair_text : null,
    created_utc: typeof p.created_utc === "number" ? new Date(p.created_utc * 1000).toISOString() : null,
  }));
}

export async function pullReddit(): Promise<{ inserted: number; skipped: number; failedSubreddits: string[] }> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT || "marketpulse/1.0";

  if (!clientId || !clientSecret) {
    console.warn("[reddit_pull] REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET not set - skipping Reddit ingestion");
    return { inserted: 0, skipped: 0, failedSubreddits: [] };
  }

  const supabase = getSupabaseClient();
  const subreddits = loadSubreddits();

  let inserted = 0;
  let skipped = 0;
  const failedSubreddits: string[] = [];

  try {
    const token = await getAccessToken(clientId, clientSecret, userAgent);

    for (const sub of subreddits) {
      try {
        const posts = await fetchSubredditPosts(token, userAgent, sub.name);

        for (const post of posts) {
          const { error } = await supabase.from("reddit_posts").insert(post);
          if (error) {
            if (error.code === "23505") skipped++; // already ingested - expected steady state
            else throw error;
          } else {
            inserted++;
          }
        }
        console.log(`[reddit_pull] r/${sub.name}: ${posts.length} posts seen`);
      } catch (err) {
        console.warn(`[reddit_pull] r/${sub.name} failed:`, err instanceof Error ? err.message : err);
        failedSubreddits.push(sub.name);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Reddit's own rate-limit guidance: stay well under 60 req/min
    }
  } catch (err) {
    console.error("[reddit_pull] OAuth/setup failed:", err instanceof Error ? err.message : err);
    return { inserted, skipped, failedSubreddits: subreddits.map((s) => s.name) };
  }

  console.log(`[reddit_pull] done - inserted ${inserted}, skipped ${skipped} duplicates, ${failedSubreddits.length} subreddits failed`);
  return { inserted, skipped, failedSubreddits };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  pullReddit().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
