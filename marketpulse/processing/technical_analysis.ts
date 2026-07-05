// Deterministic, rules-based technical read — computed entirely from real
// indicator values (no LLM). This is the primary analysis/outlook/risk
// engine for the digest; Groq is only used elsewhere for narrow NLP tasks
// (per-article sentiment tagging, trend-ticker discovery as a secondary
// signal) that genuinely need language understanding, not for the numeric
// conclusions themselves.

export type TechnicalSnapshot = {
  close: number;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  atr14: number | null;
  adx14: number | null;
  obv: number | null;
  obvSma20: number | null;
  stochK: number | null;
  stochD: number | null;
  priceChangePct: number | null;
  volume: number | null;
  avgVolume20: number | null;
  high52w: number | null;
  low52w: number | null;
};

export type TechnicalRead = {
  outlook: string;
  riskNotes: string;
  trendSignal: "bullish" | "bearish" | "neutral";
  riskLevel: "low" | "moderate" | "elevated";
};

function pct(n: number, digits = 1) {
  return `${n.toFixed(digits)}%`;
}

export function analyzeTechnicals(t: TechnicalSnapshot): TechnicalRead {
  const notes: string[] = [];
  const risks: string[] = [];
  let bullishPoints = 0;
  let bearishPoints = 0;

  // --- RSI: momentum / overbought-oversold ---
  if (t.rsi14 != null) {
    if (t.rsi14 >= 70) {
      notes.push(`RSI at ${t.rsi14.toFixed(1)} is in overbought territory, suggesting the recent up-move may be stretched.`);
      risks.push(`Overbought RSI (${t.rsi14.toFixed(1)}) raises the odds of a short-term pullback or consolidation.`);
      bullishPoints += 1; // still net-bullish momentum, but flagged as extended
    } else if (t.rsi14 <= 30) {
      notes.push(`RSI at ${t.rsi14.toFixed(1)} is in oversold territory, suggesting selling may be overdone in the near term.`);
      risks.push(`Oversold RSI (${t.rsi14.toFixed(1)}) can persist in a strong downtrend — oversold is not automatically a buy signal.`);
      bearishPoints += 1;
    } else if (t.rsi14 >= 55) {
      notes.push(`RSI at ${t.rsi14.toFixed(1)} shows constructive momentum without being overbought.`);
      bullishPoints += 1;
    } else if (t.rsi14 <= 45) {
      notes.push(`RSI at ${t.rsi14.toFixed(1)} shows soft momentum, leaning bearish.`);
      bearishPoints += 1;
    } else {
      notes.push(`RSI at ${t.rsi14.toFixed(1)} is neutral, showing no strong momentum bias either way.`);
    }
  }

  // --- MACD: trend/momentum confirmation ---
  if (t.macd != null && t.macdSignal != null) {
    const macdBullish = t.macd > t.macdSignal;
    const gap = Math.abs(t.macd - t.macdSignal);
    if (macdBullish) {
      notes.push(`MACD is above its signal line${gap > 0 ? ", confirming near-term bullish momentum" : ""}.`);
      bullishPoints += 1;
    } else {
      notes.push(`MACD is below its signal line, confirming near-term bearish momentum.`);
      bearishPoints += 1;
    }
  }

  // --- Moving averages: trend structure ---
  if (t.sma20 != null && t.sma50 != null) {
    if (t.close > t.sma20 && t.close > t.sma50 && t.sma20 > t.sma50) {
      notes.push(`Price is trading above both the 20-day and 50-day moving averages, consistent with an established uptrend.`);
      bullishPoints += 1;
    } else if (t.close < t.sma20 && t.close < t.sma50 && t.sma20 < t.sma50) {
      notes.push(`Price is trading below both the 20-day and 50-day moving averages, consistent with an established downtrend.`);
      bearishPoints += 1;
    } else {
      notes.push(`Price is mixed relative to its 20- and 50-day moving averages, suggesting a range-bound or transitional phase.`);
      risks.push(`No clear trend structure from moving averages — whipsaw risk is higher in a range-bound market.`);
    }
  }

  // --- Long-term structure: SMA50 vs SMA200 ("golden/death cross" state) ---
  if (t.sma50 != null && t.sma200 != null) {
    if (t.sma50 > t.sma200) {
      notes.push(`The 50-day moving average is above the 200-day (golden-cross configuration) — the longer-term trend structure is bullish.`);
      bullishPoints += 1;
    } else {
      notes.push(`The 50-day moving average is below the 200-day (death-cross configuration) — the longer-term trend structure is bearish.`);
      bearishPoints += 1;
      risks.push(`Long-term structure is bearish (50-day average below 200-day) — any near-term bullish signals are counter-trend against the bigger picture.`);
    }
  }

  // --- ADX: trend STRENGTH, independent of direction. A "bullish" MACD/SMA
  // reading during a weak (low-ADX) trend is much less reliable than the
  // same reading with a strong trend behind it. ---
  let trendIsWeak = false;
  if (t.adx14 != null) {
    if (t.adx14 < 20) {
      trendIsWeak = true;
      notes.push(`ADX at ${t.adx14.toFixed(1)} indicates a weak or absent trend — directional signals above are less reliable in this kind of choppy market.`);
      risks.push(`Low ADX (${t.adx14.toFixed(1)}) — this looks range-bound rather than trending, which raises the odds that direction-based signals whipsaw.`);
    } else if (t.adx14 >= 40) {
      notes.push(`ADX at ${t.adx14.toFixed(1)} confirms a strong, well-established trend.`);
    }
  }

  // --- OBV: does volume actually confirm the price trend? A classic
  // "smart money" divergence check — price up on weak/declining volume is a
  // materially different signal than price up on strong, rising volume. ---
  if (t.obv != null && t.obvSma20 != null) {
    const obvBullish = t.obv > t.obvSma20;
    if (t.priceChangePct != null) {
      if (t.priceChangePct > 0 && !obvBullish) {
        notes.push(`Price is up but On-Balance Volume is below its 20-day average — volume isn't confirming the move, a bearish divergence worth watching.`);
        risks.push(`Volume/price divergence (price up, OBV weak) can precede a reversal if buying interest doesn't follow through.`);
      } else if (t.priceChangePct < 0 && obvBullish) {
        notes.push(`Price is down but On-Balance Volume is above its 20-day average — volume isn't confirming the decline, a bullish divergence worth watching.`);
      } else if (obvBullish) {
        bullishPoints += 1;
      } else {
        bearishPoints += 1;
      }
    }
  }

  // --- Stochastic: secondary momentum check against RSI ---
  if (t.stochK != null) {
    const stochOverbought = t.stochK >= 80;
    const stochOversold = t.stochK <= 20;
    if (stochOverbought && t.rsi14 != null && t.rsi14 >= 70) {
      notes.push(`Stochastic (${t.stochK.toFixed(1)}) agrees with RSI on overbought conditions — two independent momentum readings both point the same way.`);
    } else if (stochOversold && t.rsi14 != null && t.rsi14 <= 30) {
      notes.push(`Stochastic (${t.stochK.toFixed(1)}) agrees with RSI on oversold conditions — two independent momentum readings both point the same way.`);
    }
  }

  // --- Bollinger Bands: volatility / extension ---
  if (t.bbUpper != null && t.bbLower != null) {
    const bandWidth = t.bbUpper - t.bbLower;
    if (bandWidth > 0) {
      const posInBand = (t.close - t.bbLower) / bandWidth; // 0 = at lower band, 1 = at upper band
      if (posInBand >= 0.95) {
        notes.push(`Price is trading at the upper Bollinger Band, indicating the move may be extended in the short term.`);
        risks.push(`Price at the upper Bollinger Band increases the chance of a mean-reversion pullback.`);
      } else if (posInBand <= 0.05) {
        notes.push(`Price is trading at the lower Bollinger Band, indicating the down-move may be extended in the short term.`);
        risks.push(`Price at the lower Bollinger Band can mean-revert, but can also mark the start of a deeper decline — context matters.`);
      }
    }
  }

  // --- ATR: volatility / position-sizing risk ---
  let riskLevel: TechnicalRead["riskLevel"] = "moderate";
  if (t.atr14 != null && t.close > 0) {
    const atrPctOfPrice = (t.atr14 / t.close) * 100;
    if (atrPctOfPrice >= 3) {
      risks.push(`Above-average volatility (ATR ${pct(atrPctOfPrice)} of price) — expect wider day-to-day swings than a typical large-cap.`);
      riskLevel = "elevated";
    } else if (atrPctOfPrice <= 1) {
      riskLevel = "low";
    }
  }

  // --- Recent price move context, incl. circuit-limit-style flagging ---
  // NSE applies exchange circuit bands at roughly 5/10/20% depending on the
  // stock — a move at or beyond those thresholds is a materially different
  // event from ordinary daily noise, not just "larger than usual".
  if (t.priceChangePct != null) {
    const abs = Math.abs(t.priceChangePct);
    const direction = t.priceChangePct > 0 ? "gain" : "decline";
    if (abs >= 18) {
      notes.push(`Today's ${pct(abs, 2)} ${direction} is at or near typical NSE circuit-limit territory (~20%) — an unusually severe single-day move.`);
      risks.push(`Circuit-limit-range move (${pct(t.priceChangePct, 2)}) — this is a rare, high-severity event; treat with extra caution and check for company-specific news before assuming it's noise.`);
      riskLevel = "elevated";
    } else if (abs >= 8) {
      notes.push(`Today's ${pct(abs, 2)} ${direction} is a large single-day move, well outside typical daily ranges for a liquid large/mid-cap.`);
      risks.push(`Large single-day move (${pct(t.priceChangePct, 2)}) — often driven by results, corporate action, or major news; can reverse sharply once the immediate reaction settles.`);
      riskLevel = "elevated";
    } else if (abs >= 3) {
      notes.push(`Today's ${direction} of ${pct(abs, 2)} is a larger-than-usual single-day move.`);
      risks.push(`A large single-day move (${pct(t.priceChangePct, 2)}) can attract profit-taking or short-covering in the following sessions.`);
    }
  }

  // --- Volume: irregular activity ---
  if (t.volume != null && t.avgVolume20 != null && t.avgVolume20 > 0) {
    const volumeRatio = t.volume / t.avgVolume20;
    if (volumeRatio >= 3) {
      notes.push(`Trading volume is ${volumeRatio.toFixed(1)}x the 20-day average — a significant spike in activity, often a sign of a major news event or institutional order flow.`);
      risks.push(`Volume ${volumeRatio.toFixed(1)}x the recent average — irregular activity like this can precede continued volatility either direction.`);
      riskLevel = "elevated";
    } else if (volumeRatio >= 1.8) {
      notes.push(`Trading volume is running ${volumeRatio.toFixed(1)}x above its 20-day average, above-normal activity.`);
    }
  }

  // --- 52-week range: where today sits in the longer-term context ---
  if (t.high52w != null && t.low52w != null && t.high52w > t.low52w) {
    const posInRange = (t.close - t.low52w) / (t.high52w - t.low52w);
    if (posInRange >= 0.98) {
      notes.push(`Price is at or within 2% of its 52-week high (${t.high52w.toFixed(2)}).`);
      risks.push(`Trading near the 52-week high — no overhead resistance from recent price history, but also historically a level where profit-taking increases.`);
    } else if (posInRange <= 0.02) {
      notes.push(`Price is at or within 2% of its 52-week low (${t.low52w.toFixed(2)}).`);
      risks.push(`Trading near the 52-week low — could reflect a genuine deterioration in fundamentals rather than a short-term dip; verify why before assuming it's a bargain.`);
    }
  }

  // A weak/absent trend (low ADX) means direction-based signals are less
  // trustworthy — require a clearer majority before calling it bullish/bearish
  // rather than neutral, instead of any 1-point edge deciding it.
  const margin = trendIsWeak ? 2 : 1;
  const trendSignal: TechnicalRead["trendSignal"] =
    bullishPoints - bearishPoints >= margin ? "bullish" : bearishPoints - bullishPoints >= margin ? "bearish" : "neutral";

  return {
    outlook: notes.length > 0 ? notes.join(" ") : "Not enough indicator history yet to form a technical read.",
    riskNotes: risks.length > 0 ? risks.join(" ") : "No elevated risk flags from current technicals.",
    trendSignal,
    riskLevel,
  };
}
