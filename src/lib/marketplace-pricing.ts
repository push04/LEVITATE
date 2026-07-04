export const MARKETPLACE_OPTIONS = ['amazon', 'flipkart', 'meesho'] as const
export type MarketplaceOption = (typeof MARKETPLACE_OPTIONS)[number]

export const MARKETPLACE_LABELS: Record<MarketplaceOption, string> = {
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  meesho: 'Meesho',
}

// Per product, per marketplace selected.
export const BASE_PRICE_PER_PRODUCT_PER_MARKETPLACE = 149
// Per product, one-time, applies once regardless of how many marketplaces are selected.
export const PHOTOGRAPHY_ADDON_PER_PRODUCT = 299
export const TAGGING_ADDON_PER_PRODUCT = 99

/** Pulls the numeric discount out of a plan's feature_controls JSON blob. */
export function extractMarketplaceDiscountPct(featureControls: unknown): number {
  const pct = (featureControls as { marketplaceDiscountPct?: number } | null)?.marketplaceDiscountPct
  return typeof pct === 'number' && pct >= 0 && pct < 1 ? pct : 0
}

export function computeMarketplaceQuote(params: {
  productCount: number
  marketplaceCount: number
  addonPhotography: boolean
  addonTagging: boolean
  /**
   * Plan-based discount on the listing subtotal, read from the plan's own
   * onboarding_plans.feature_controls.marketplaceDiscountPct — never keyed by
   * plan display name, which would silently break if a plan is renamed.
   */
  discountPct: number
}) {
  const { productCount, marketplaceCount, addonPhotography, addonTagging, discountPct } = params

  const listingCost = productCount * marketplaceCount * BASE_PRICE_PER_PRODUCT_PER_MARKETPLACE
  const addonCost =
    (addonPhotography ? productCount * PHOTOGRAPHY_ADDON_PER_PRODUCT : 0) +
    (addonTagging ? productCount * TAGGING_ADDON_PER_PRODUCT : 0)

  const subtotal = listingCost + addonCost
  const discountAmount = Math.round(subtotal * discountPct)
  const total = subtotal - discountAmount

  return { listingCost, addonCost, subtotal, discountPct, discountAmount, total }
}
