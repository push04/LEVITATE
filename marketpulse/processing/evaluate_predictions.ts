import "dotenv/config";
import { pathToFileURL } from "node:url";
import { getSupabaseClient } from "../db/supabase_client.js";

// Thresholds for what counts as the prediction actually playing out, rather
// than the stock just drifting with ordinary noise. Kept deliberately modest
// (1%) for bullish/bearish so "correct" isn't grading on an easy curve, and
// slightly wider (2%) for neutral/hold since "stayed roughly flat" is the
// claim being checked there.
const DIRECTIONAL_THRESHOLD_PCT = 1;
const NEUTRAL_BAND_PCT = 2;

export function outcomeFor(signal: string, priceChangePct: number): "correct" | "incorrect" | "inconclusive" {
  if (signal === "bullish") {
    if (priceChangePct > DIRECTIONAL_THRESHOLD_PCT) return "correct";
    if (priceChangePct < -DIRECTIONAL_THRESHOLD_PCT) return "incorrect";
    return "inconclusive";
  }
  if (signal === "bearish") {
    if (priceChangePct < -DIRECTIONAL_THRESHOLD_PCT) return "correct";
    if (priceChangePct > DIRECTIONAL_THRESHOLD_PCT) return "incorrect";
    return "inconclusive";
  }
  // neutral/hold: correct if it stayed roughly flat, incorrect if it moved a lot either way
  return Math.abs(priceChangePct) <= NEUTRAL_BAND_PCT ? "correct" : "incorrect";
}

// Auto-evaluates every prediction whose target_date has arrived, against
// what the price actually did — this is the accountability mechanism: every
// signal digest.ts records gets checked, none are just asserted and
// forgotten. Powers the public/business "track record" display.
export async function evaluatePredictions(): Promise<{ evaluated: number }> {
  const supabase = getSupabaseClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: due, error } = await supabase
    .from("predictions")
    .select("id, ticker, prediction_date, signal, price_at_prediction, target_date")
    .eq("evaluated", false)
    .lte("target_date", todayStr);
  if (error) throw error;

  let evaluated = 0;

  for (const p of due ?? []) {
    // Nearest available trading-day price on/after the target date (markets
    // don't trade every calendar day — weekends/holidays would otherwise
    // leave a prediction stuck un-evaluatable forever).
    const { data: priceRow } = await supabase
      .from("price_data")
      .select("date, close")
      .eq("ticker", p.ticker)
      .gte("date", p.target_date)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!priceRow) continue; // no price yet at/after target — try again next run

    const priceChangePct = Math.round(((priceRow.close - p.price_at_prediction) / p.price_at_prediction) * 10000) / 100;
    const outcome = outcomeFor(p.signal, priceChangePct);

    const { error: updateError } = await supabase
      .from("predictions")
      .update({
        evaluated: true,
        evaluation_date: priceRow.date,
        price_at_evaluation: priceRow.close,
        price_change_pct: priceChangePct,
        outcome,
      })
      .eq("id", p.id);

    if (!updateError) evaluated++;
  }

  console.log(`[evaluate_predictions] evaluated ${evaluated} of ${due?.length ?? 0} due predictions`);
  return { evaluated };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  evaluatePredictions().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
