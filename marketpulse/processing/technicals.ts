import "dotenv/config";
import { pathToFileURL } from "node:url";
import { RSI, MACD, BollingerBands, SMA, EMA, ATR, ADX, OBV, Stochastic, CCI, WilliamsR } from "technicalindicators";
import { getSupabaseClient } from "../db/supabase_client.js";

type PriceRow = { date: string; open: number; high: number; low: number; close: number; volume: number };

// technicalindicators' `.calculate()` returns an array shorter than the input
// (it needs `period` warmup values before it can produce a first result) -
// this aligns each output value back to the trailing date it belongs to.
function alignToDates<T>(dates: string[], values: T[]): Array<{ date: string; value: T }> {
  const offset = dates.length - values.length;
  if (offset < 0) return [];
  return values.map((value, i) => ({ date: dates[offset + i], value }));
}

function trendSignal(rsi: number | undefined, macd: number | undefined, macdSignal: number | undefined): string {
  if (rsi == null) return "neutral";
  const macdBullish = macd != null && macdSignal != null && macd > macdSignal;
  if (rsi >= 60 && macdBullish) return "bullish";
  if (rsi <= 40 && !macdBullish) return "bearish";
  return "neutral";
}

export async function computeTechnicals(): Promise<{ tickersProcessed: number; rowsUpserted: number }> {
  const supabase = getSupabaseClient();
  const { data: watchlist, error } = await supabase.from("watchlist").select("ticker").eq("active", true);
  if (error) throw error;

  let tickersProcessed = 0;
  let rowsUpserted = 0;
  let warnedMissingColumns = false;

  for (const row of watchlist ?? []) {
    const ticker = row.ticker as string;
    const { data: priceRows, error: priceError } = await supabase
      .from("price_data")
      .select("date, open, high, low, close, volume")
      .eq("ticker", ticker)
      .order("date", { ascending: true });

    if (priceError || !priceRows || priceRows.length < 20) continue; // not enough history for meaningful indicators

    const bars = priceRows as PriceRow[];
    const dates = bars.map((b) => b.date);
    const closes = bars.map((b) => b.close);
    const highs = bars.map((b) => b.high);
    const lows = bars.map((b) => b.low);

    const rsi14 = alignToDates(dates, RSI.calculate({ period: 14, values: closes }));
    const macdRaw = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const macd = alignToDates(dates, macdRaw);
    const sma20 = alignToDates(dates, SMA.calculate({ period: 20, values: closes }));
    const sma50 = alignToDates(dates, SMA.calculate({ period: 50, values: closes }));
    const sma200 = alignToDates(dates, SMA.calculate({ period: 200, values: closes })); // needs ~1y of history - empty until enough accumulates
    const ema20 = alignToDates(dates, EMA.calculate({ period: 20, values: closes }));
    const bb = alignToDates(dates, BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 }));
    const atr14 = alignToDates(dates, ATR.calculate({ period: 14, high: highs, low: lows, close: closes }));
    // ADX: trend STRENGTH (as opposed to MACD/SMA which give trend direction)
    // - a market can be "bullish by direction" but weak/choppy by strength.
    const adx14 = alignToDates(dates, ADX.calculate({ period: 14, high: highs, low: lows, close: closes }));
    // OBV: does volume actually confirm the price trend, or is it diverging
    // (a classic "smart money" tell). Its own 20-day SMA shows OBV's trend.
    const obvValues = OBV.calculate({ close: closes, volume: bars.map((b) => b.volume) });
    const obv = alignToDates(dates, obvValues);
    const obvSma20 = alignToDates(dates, SMA.calculate({ period: 20, values: obvValues }));
    const stoch = alignToDates(dates, Stochastic.calculate({ period: 14, signalPeriod: 3, high: highs, low: lows, close: closes }));
    // CCI/Williams %R: backtested as mean-reversion "fade the extreme" signals
    // (see technical_analysis.ts) - genuinely predictive here, unlike trying
    // to use RSI/Bollinger extremes the same way, which empirically didn't hold up.
    const cci20 = alignToDates(dates, CCI.calculate({ period: 20, high: highs, low: lows, close: closes }));
    const williamsR14 = alignToDates(dates, WilliamsR.calculate({ period: 14, high: highs, low: lows, close: closes }));

    // Merge everything keyed by date.
    const byDate = new Map<string, Record<string, number | string | null>>();
    for (const d of dates) byDate.set(d, { date: d });

    for (const r of rsi14) byDate.get(r.date)!.rsi_14 = r.value;
    for (const m of macd) {
      const row = byDate.get(m.date)!;
      row.macd = m.value.MACD ?? null;
      row.macd_signal = m.value.signal ?? null;
      row.macd_hist = m.value.histogram ?? null;
    }
    for (const s of sma20) byDate.get(s.date)!.sma_20 = s.value;
    for (const s of sma50) byDate.get(s.date)!.sma_50 = s.value;
    for (const s of sma200) byDate.get(s.date)!.sma_200 = s.value;
    for (const e of ema20) byDate.get(e.date)!.ema_20 = e.value;
    for (const b of bb) {
      const row = byDate.get(b.date)!;
      row.bb_upper = b.value.upper ?? null;
      row.bb_middle = b.value.middle ?? null;
      row.bb_lower = b.value.lower ?? null;
    }
    for (const a of atr14) byDate.get(a.date)!.atr_14 = a.value;
    for (const a of adx14) byDate.get(a.date)!.adx_14 = a.value.adx ?? null;
    for (const o of obv) byDate.get(o.date)!.obv = o.value;
    for (const o of obvSma20) byDate.get(o.date)!.obv_sma_20 = o.value;
    for (const s of stoch) {
      const row = byDate.get(s.date)!;
      row.stoch_k = s.value.k ?? null;
      row.stoch_d = s.value.d ?? null;
    }
    for (const c of cci20) byDate.get(c.date)!.cci_20 = c.value;
    for (const w of williamsR14) byDate.get(w.date)!.williams_r_14 = w.value;

    const payload = Array.from(byDate.values())
      .filter((row) => row.rsi_14 != null) // only rows with at least the core indicator computed
      .map((row) => ({
        ticker,
        date: row.date,
        rsi_14: row.rsi_14 ?? null,
        macd: row.macd ?? null,
        macd_signal: row.macd_signal ?? null,
        macd_hist: row.macd_hist ?? null,
        sma_20: row.sma_20 ?? null,
        sma_50: row.sma_50 ?? null,
        sma_200: row.sma_200 ?? null,
        ema_20: row.ema_20 ?? null,
        bb_upper: row.bb_upper ?? null,
        bb_middle: row.bb_middle ?? null,
        bb_lower: row.bb_lower ?? null,
        atr_14: row.atr_14 ?? null,
        adx_14: row.adx_14 ?? null,
        obv: row.obv ?? null,
        obv_sma_20: row.obv_sma_20 ?? null,
        stoch_k: row.stoch_k ?? null,
        stoch_d: row.stoch_d ?? null,
        cci_20: row.cci_20 ?? null,
        williams_r_14: row.williams_r_14 ?? null,
        trend_signal: trendSignal(row.rsi_14 as number | undefined, row.macd as number | undefined, row.macd_signal as number | undefined),
      }));

    if (payload.length === 0) continue;

    let { error: upsertError } = await supabase.from("technical_indicators").upsert(payload, { onConflict: "ticker,date" });
    if (upsertError?.code === "PGRST204") {
      // marketpulse/db/more_technicals.sql hasn't been run yet (adds
      // cci_20/williams_r_14) - don't let that block every other indicator
      // from updating; retry without the two new columns.
      const strippedPayload = payload.map(({ cci_20, williams_r_14, ...rest }) => rest);
      const retry = await supabase.from("technical_indicators").upsert(strippedPayload, { onConflict: "ticker,date" });
      upsertError = retry.error;
      if (!upsertError && !warnedMissingColumns) {
        console.warn("[technicals] cci_20/williams_r_14 columns not found - run marketpulse/db/more_technicals.sql to enable them.");
        warnedMissingColumns = true;
      }
    }
    if (upsertError) {
      console.warn(`[technicals] ${ticker} upsert failed:`, upsertError.message);
      continue;
    }

    tickersProcessed++;
    rowsUpserted += payload.length;
  }

  console.log(`[technicals] done - ${tickersProcessed} tickers processed, ${rowsUpserted} rows upserted`);
  return { tickersProcessed, rowsUpserted };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  computeTechnicals().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
