// Deterministic, rules-based technical read - computed entirely from real
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
  cci20: number | null;
  williamsR14: number | null;
  priceChangePct: number | null;
  volume: number | null;
  avgVolume20: number | null;
  high52w: number | null;
  low52w: number | null;
};

export type Finding = { text: string; tone: "bullish" | "bearish" | "neutral" };
export type RiskFinding = { text: string; severity: "high" | "medium" };

export type TechnicalRead = {
  outlook: string;
  riskNotes: string;
  trendSignal: "bullish" | "bearish" | "neutral";
  riskLevel: "low" | "moderate" | "elevated";
  // Structured versions of the same content above, for rendering as a real
  // checklist (icon + tone per line) instead of a wall of prose.
  findings: Finding[];
  riskFindings: RiskFinding[];
};

function pct(n: number, digits = 1) {
  return `${n.toFixed(digits)}%`;
}

export function analyzeTechnicals(t: TechnicalSnapshot): TechnicalRead {
  const notes: string[] = [];
  const risks: string[] = [];
  const findings: Finding[] = [];
  const riskFindings: RiskFinding[] = [];
  let bullishPoints = 0;
  let bearishPoints = 0;

  function note(text: string, tone: Finding["tone"]) {
    notes.push(text);
    findings.push({ text, tone });
  }
  function risk(text: string, severity: RiskFinding["severity"]) {
    risks.push(text);
    riskFindings.push({ text, severity });
  }

  // --- RSI: momentum / overbought-oversold ---
  if (t.rsi14 != null) {
    if (t.rsi14 >= 70) {
      note(`RSI at ${t.rsi14.toFixed(1)} is in overbought territory, suggesting the recent up-move may be stretched.`, "bullish");
      risk(`Overbought RSI (${t.rsi14.toFixed(1)}) raises the odds of a short-term pullback or consolidation.`, "medium");
      bullishPoints += 1; // still net-bullish momentum, but flagged as extended
    } else if (t.rsi14 <= 30) {
      note(`RSI at ${t.rsi14.toFixed(1)} is in oversold territory, suggesting selling may be overdone in the near term.`, "bearish");
      risk(`Oversold RSI (${t.rsi14.toFixed(1)}) can persist in a strong downtrend - oversold is not automatically a buy signal.`, "medium");
      bearishPoints += 1;
    } else if (t.rsi14 >= 55) {
      note(`RSI at ${t.rsi14.toFixed(1)} shows constructive momentum without being overbought.`, "bullish");
      bullishPoints += 1;
    } else if (t.rsi14 <= 45) {
      note(`RSI at ${t.rsi14.toFixed(1)} shows soft momentum, leaning bearish.`, "bearish");
      bearishPoints += 1;
    } else {
      note(`RSI at ${t.rsi14.toFixed(1)} is neutral, showing no strong momentum bias either way.`, "neutral");
    }
  }

  // --- MACD: trend/momentum confirmation ---
  if (t.macd != null && t.macdSignal != null) {
    const macdBullish = t.macd > t.macdSignal;
    if (macdBullish) {
      note(`MACD is above its signal line, confirming near-term bullish momentum.`, "bullish");
      bullishPoints += 1;
    } else {
      note(`MACD is below its signal line, confirming near-term bearish momentum.`, "bearish");
      bearishPoints += 1;
    }
  }

  // --- Moving averages: trend structure ---
  if (t.sma20 != null && t.sma50 != null) {
    if (t.close > t.sma20 && t.close > t.sma50 && t.sma20 > t.sma50) {
      note(`Price is trading above both the 20-day and 50-day moving averages, consistent with an established uptrend.`, "bullish");
      bullishPoints += 1;
    } else if (t.close < t.sma20 && t.close < t.sma50 && t.sma20 < t.sma50) {
      note(`Price is trading below both the 20-day and 50-day moving averages, consistent with an established downtrend.`, "bearish");
      bearishPoints += 1;
    } else {
      note(`Price is mixed relative to its 20- and 50-day moving averages, suggesting a range-bound or transitional phase.`, "neutral");
      risk(`No clear trend structure from moving averages - whipsaw risk is higher in a range-bound market.`, "medium");
    }
  }

  // --- Long-term structure: SMA50 vs SMA200 ("golden/death cross" state) ---
  if (t.sma50 != null && t.sma200 != null) {
    if (t.sma50 > t.sma200) {
      note(`The 50-day moving average is above the 200-day (golden-cross configuration) - the longer-term trend structure is bullish.`, "bullish");
      bullishPoints += 1;
    } else {
      note(`The 50-day moving average is below the 200-day (death-cross configuration) - the longer-term trend structure is bearish.`, "bearish");
      bearishPoints += 1;
      risk(`Long-term structure is bearish (50-day average below 200-day) - any near-term bullish signals are counter-trend against the bigger picture.`, "medium");
    }
  }

  // --- ADX: trend STRENGTH, independent of direction. A "bullish" MACD/SMA
  // reading during a weak (low-ADX) trend is much less reliable than the
  // same reading with a strong trend behind it. ---
  let trendIsWeak = false;
  if (t.adx14 != null) {
    if (t.adx14 < 20) {
      trendIsWeak = true;
      note(`ADX at ${t.adx14.toFixed(1)} indicates a weak or absent trend - directional signals above are less reliable in this kind of choppy market.`, "neutral");
      risk(`Low ADX (${t.adx14.toFixed(1)}) - this looks range-bound rather than trending, which raises the odds that direction-based signals whipsaw.`, "medium");
    } else if (t.adx14 >= 40) {
      note(`ADX at ${t.adx14.toFixed(1)} confirms a strong, well-established trend.`, "neutral");
    }
  }

  // --- OBV: does volume actually confirm the price trend? A classic
  // "smart money" divergence check - price up on weak/declining volume is a
  // materially different signal than price up on strong, rising volume. ---
  if (t.obv != null && t.obvSma20 != null) {
    const obvBullish = t.obv > t.obvSma20;
    if (t.priceChangePct != null) {
      if (t.priceChangePct > 0 && !obvBullish) {
        note(`Price is up but On-Balance Volume is below its 20-day average - volume isn't confirming the move, a bearish divergence worth watching.`, "bearish");
        risk(`Volume/price divergence (price up, OBV weak) can precede a reversal if buying interest doesn't follow through.`, "medium");
      } else if (t.priceChangePct < 0 && obvBullish) {
        note(`Price is down but On-Balance Volume is above its 20-day average - volume isn't confirming the decline, a bullish divergence worth watching.`, "bullish");
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
      note(`Stochastic (${t.stochK.toFixed(1)}) agrees with RSI on overbought conditions - two independent momentum readings both point the same way.`, "bearish");
    } else if (stochOversold && t.rsi14 != null && t.rsi14 <= 30) {
      note(`Stochastic (${t.stochK.toFixed(1)}) agrees with RSI on oversold conditions - two independent momentum readings both point the same way.`, "bullish");
    }
  }

  // --- CCI / Williams %R: mean-reversion "fade the extreme" signals ---
  // Backtested against a year of real history (marketpulse/processing/
  // backtest.ts) specifically as reversal signals, not trend-continuation -
  // unlike RSI/MACD/MA structure above, extremes here showed a genuine,
  // monotonic tendency to fade over the following week rather than continue.
  if (t.cci20 != null) {
    if (t.cci20 >= 100) {
      note(`CCI at ${t.cci20.toFixed(0)} is in overbought territory - historically more likely to fade than extend further over the next week.`, "bearish");
      bearishPoints += 1;
    } else if (t.cci20 <= -100) {
      note(`CCI at ${t.cci20.toFixed(0)} is in oversold territory - historically more likely to bounce than continue falling over the next week.`, "bullish");
      bullishPoints += 1;
    }
  }
  if (t.williamsR14 != null) {
    if (t.williamsR14 >= -20) {
      note(`Williams %R at ${t.williamsR14.toFixed(0)} is in overbought territory, adding to short-term fade risk.`, "bearish");
      bearishPoints += 1;
    } else if (t.williamsR14 <= -80) {
      note(`Williams %R at ${t.williamsR14.toFixed(0)} is in oversold territory, adding to short-term bounce odds.`, "bullish");
      bullishPoints += 1;
    }
  }

  // --- Bollinger Bands: volatility / extension ---
  if (t.bbUpper != null && t.bbLower != null) {
    const bandWidth = t.bbUpper - t.bbLower;
    if (bandWidth > 0) {
      const posInBand = (t.close - t.bbLower) / bandWidth; // 0 = at lower band, 1 = at upper band
      if (posInBand >= 0.95) {
        note(`Price is trading at the upper Bollinger Band, indicating the move may be extended in the short term.`, "neutral");
        risk(`Price at the upper Bollinger Band increases the chance of a mean-reversion pullback.`, "medium");
      } else if (posInBand <= 0.05) {
        note(`Price is trading at the lower Bollinger Band, indicating the down-move may be extended in the short term.`, "neutral");
        risk(`Price at the lower Bollinger Band can mean-revert, but can also mark the start of a deeper decline - context matters.`, "medium");
      }
    }
  }

  // --- ATR: volatility / position-sizing risk ---
  let riskLevel: TechnicalRead["riskLevel"] = "moderate";
  if (t.atr14 != null && t.close > 0) {
    const atrPctOfPrice = (t.atr14 / t.close) * 100;
    if (atrPctOfPrice >= 3) {
      risk(`Above-average volatility (ATR ${pct(atrPctOfPrice)} of price) - expect wider day-to-day swings than a typical large-cap.`, "high");
      riskLevel = "elevated";
    } else if (atrPctOfPrice <= 1) {
      riskLevel = "low";
    }
  }

  // --- Recent price move context, incl. circuit-limit-style flagging ---
  // NSE applies exchange circuit bands at roughly 5/10/20% depending on the
  // stock - a move at or beyond those thresholds is a materially different
  // event from ordinary daily noise, not just "larger than usual".
  if (t.priceChangePct != null) {
    const abs = Math.abs(t.priceChangePct);
    const direction = t.priceChangePct > 0 ? "gain" : "decline";
    if (abs >= 18) {
      note(`Today's ${pct(abs, 2)} ${direction} is at or near typical NSE circuit-limit territory (~20%) - an unusually severe single-day move.`, "neutral");
      risk(`Circuit-limit-range move (${pct(t.priceChangePct, 2)}) - this is a rare, high-severity event; treat with extra caution and check for company-specific news before assuming it's noise.`, "high");
      riskLevel = "elevated";
    } else if (abs >= 8) {
      note(`Today's ${pct(abs, 2)} ${direction} is a large single-day move, well outside typical daily ranges for a liquid large/mid-cap.`, "neutral");
      risk(`Large single-day move (${pct(t.priceChangePct, 2)}) - often driven by results, corporate action, or major news; can reverse sharply once the immediate reaction settles.`, "high");
      riskLevel = "elevated";
    } else if (abs >= 3) {
      note(`Today's ${direction} of ${pct(abs, 2)} is a larger-than-usual single-day move.`, "neutral");
      risk(`A large single-day move (${pct(t.priceChangePct, 2)}) can attract profit-taking or short-covering in the following sessions.`, "medium");
    }
  }

  // --- Volume: irregular activity ---
  if (t.volume != null && t.avgVolume20 != null && t.avgVolume20 > 0) {
    const volumeRatio = t.volume / t.avgVolume20;
    if (volumeRatio >= 3) {
      note(`Trading volume is ${volumeRatio.toFixed(1)}x the 20-day average - a significant spike in activity, often a sign of a major news event or institutional order flow.`, "neutral");
      risk(`Volume ${volumeRatio.toFixed(1)}x the recent average - irregular activity like this can precede continued volatility either direction.`, "high");
      riskLevel = "elevated";
    } else if (volumeRatio >= 1.8) {
      note(`Trading volume is running ${volumeRatio.toFixed(1)}x above its 20-day average, above-normal activity.`, "neutral");
    }
  }

  // --- 52-week range: where today sits in the longer-term context ---
  if (t.high52w != null && t.low52w != null && t.high52w > t.low52w) {
    const posInRange = (t.close - t.low52w) / (t.high52w - t.low52w);
    if (posInRange >= 0.98) {
      note(`Price is at or within 2% of its 52-week high (${t.high52w.toFixed(2)}).`, "neutral");
      risk(`Trading near the 52-week high - no overhead resistance from recent price history, but also historically a level where profit-taking increases.`, "medium");
    } else if (posInRange <= 0.02) {
      note(`Price is at or within 2% of its 52-week low (${t.low52w.toFixed(2)}).`, "neutral");
      risk(`Trading near the 52-week low - could reflect a genuine deterioration in fundamentals rather than a short-term dip; verify why before assuming it's a bargain.`, "medium");
    }
  }

  // A weak/absent trend (low ADX) means direction-based signals are less
  // trustworthy - require a clearer majority before calling it bullish/bearish
  // rather than neutral, instead of any edge deciding it. Margins calibrated
  // against a full year of real backtested history (marketpulse/processing/
  // backtest.ts): every horizon from 3-10 days showed the same pattern -
  // raising the required point-margin shifts weak-evidence cases into
  // neutral (consistently the most reliable bucket, ~50-68% accuracy) and
  // out of forced directional calls (which ran as low as 15-30% at margin 1),
  // meaningfully improving overall accuracy.
  const margin = trendIsWeak ? 3 : 2;
  const trendSignal: TechnicalRead["trendSignal"] =
    bullishPoints - bearishPoints >= margin ? "bullish" : bearishPoints - bullishPoints >= margin ? "bearish" : "neutral";

  return {
    outlook: notes.length > 0 ? notes.join(" ") : "Not enough indicator history yet to form a technical read.",
    riskNotes: risks.length > 0 ? risks.join(" ") : "No elevated risk flags from current technicals.",
    trendSignal,
    riskLevel,
    findings,
    riskFindings,
  };
}
