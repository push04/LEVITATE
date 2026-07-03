// "AI-based filtering": type a freeform query ("construction tenders in Gaya
// above 5 lakh") and get back matching tenders.
//
// If GROQ_API_KEY is set, the query is parsed into structured filters
// (category / district / keywords / value range) by an LLM call, then those
// filters run against the tender list. Without a key, it falls back to
// Fuse.js fuzzy matching across title/organization/district/category — still
// handles "enter a category and get related tenders" fine, just without the
// natural-language parsing.
import Fuse from "fuse.js";
import type { Tender } from "./store.js";

export interface ParsedFilters {
  categories?: string[];
  districts?: string[];
  keywords?: string[];
  min_value?: number;
  max_value?: number;
}

const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function parseQueryWithGroq(query: string): Promise<ParsedFilters | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Extract structured search filters from a tender-search query. Respond with strict JSON only: " +
              '{"categories": string[] (from civil_works, supply, services, it, mining, health, education, other), ' +
              '"districts": string[], "keywords": string[], "min_value": number|null, "max_value": number|null}. ' +
              "Omit fields you can't infer by leaving arrays empty and numbers null.",
          },
          { role: "user", content: query },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch {
    return null; // network/quota issue — caller falls back to fuzzy search
  }
}

export async function smartSearch(tenders: Tender[], query: string): Promise<Tender[]> {
  if (!query.trim()) return tenders;

  const parsed = await parseQueryWithGroq(query);
  if (parsed) {
    return tenders.filter((t) => {
      if (parsed.categories?.length && !parsed.categories.includes(t.category || "other")) return false;
      if (
        parsed.districts?.length &&
        !parsed.districts.some((d) => t.district?.toLowerCase().includes(d.toLowerCase()))
      )
        return false;
      if (parsed.min_value != null && (t as any).estimated_value_inr != null && (t as any).estimated_value_inr < parsed.min_value)
        return false;
      if (parsed.max_value != null && (t as any).estimated_value_inr != null && (t as any).estimated_value_inr > parsed.max_value)
        return false;
      if (parsed.keywords?.length) {
        const hay = `${t.title} ${t.organization ?? ""}`.toLowerCase();
        return parsed.keywords.some((k) => hay.includes(k.toLowerCase()));
      }
      return true;
    });
  }

  const fuse = new Fuse(tenders, {
    keys: [
      { name: "title", weight: 2 },
      { name: "organization", weight: 1 },
      { name: "district", weight: 1 },
      { name: "category", weight: 1.5 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
  });
  return fuse.search(query).map((r) => r.item);
}
