// Deal finder (Unit 29). Pure and deterministic: the model never ranks products or quotes prices.
// Reliability (simulated merchant data) counts more than price; unverified, low-rated sellers are never recommended.
import { CATEGORY_LABEL, MERCHANTS, PRODUCTS, type Category, type Product } from "./products.ts";
import { formatAUD } from "../money.ts";

export type DealPick = {
  productId: string;
  name: string;
  merchant: string;
  priceCents: number;
  rating: number;
  reviews: number;
  verifiedSeller: boolean;
  returnsDays: number;
  deliveryDays: number;
  badge: "Best overall" | "Most trusted seller" | "Not recommended";
  why: string;
};
export type DealResult = { category: Category | null; maxPriceCents: number | null; picks: DealPick[]; note: string | null };

const SYNONYMS: Record<Category, string[]> = {
  headphones: ["headphone", "headphones", "over-ear", "over ear", "noise cancelling", "noise-cancelling", "anc headphones"],
  earbuds: ["earbud", "earbuds", "earphone", "earphones", "buds", "in-ear", "in ear"],
  kettle: ["kettle", "kettles"],
};

export function categoryOf(query: string): Category | null {
  const q = query.toLowerCase();
  // Earbuds first: "noise cancelling earbuds" should not match headphones.
  for (const c of ["earbuds", "kettle", "headphones"] as Category[]) if (SYNONYMS[c].some((s) => q.includes(s))) return c;
  return null;
}

/** "under $150", "below 100", "max $80", "less than $60". */
export function budgetOf(query: string): number | null {
  const m = /\b(?:under|below|less than|max(?:imum)?|up to|no more than)\s*\$?\s*(\d{1,6})(?:\.(\d{1,2}))?\b/i.exec(query);
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : null;
}

/** 0–1. Rating 50%, verified seller 20%, returns 15% (30 days = full), review volume 15% (10,000 = full). */
export function reliability(p: Product): number {
  const m = MERCHANTS[p.merchantId];
  return (
    0.5 * (m.rating / 5) +
    (m.verifiedSeller ? 0.2 : 0) +
    0.15 * (Math.min(m.returnsDays, 30) / 30) +
    0.15 * Math.min(Math.log10(Math.max(m.reviews, 1)) / 4, 1)
  );
}

/** Recommendable: a verified seller, or an unverified one rated 4.0+. */
export const recommendable = (p: Product) => MERCHANTS[p.merchantId].verifiedSeller || MERCHANTS[p.merchantId].rating >= 4;

function pick(p: Product, badge: DealPick["badge"], why: string): DealPick {
  const m = MERCHANTS[p.merchantId];
  return {
    productId: p.id,
    name: p.name,
    merchant: m.name,
    priceCents: p.priceCents,
    rating: m.rating,
    reviews: m.reviews,
    verifiedSeller: m.verifiedSeller,
    returnsDays: m.returnsDays,
    deliveryDays: m.deliveryDays,
    badge,
    why,
  };
}

const facts = (p: Product) => {
  const m = MERCHANTS[p.merchantId];
  return `${m.rating.toFixed(1)}★ from ${m.reviews.toLocaleString("en-AU")} reviews, ${m.verifiedSeller ? "verified seller" : "unverified seller"}, ${m.returnsDays ? `${m.returnsDays}-day returns` : "no returns"}`;
};

/** Up to 2 recommendations (best overall, then the most trusted seller if different), plus a warning about a cheaper risky listing. */
export function findDeals(query: string, maxPriceCents: number | null = budgetOf(query)): DealResult {
  const category = categoryOf(query);
  if (!category) return { category: null, maxPriceCents, picks: [], note: `We can search ${Object.values(CATEGORY_LABEL).join(", ").toLowerCase()}.` };

  const all = Object.values(PRODUCTS).filter((p) => p.category === category && (maxPriceCents === null || p.priceCents <= maxPriceCents));
  const good = all.filter(recommendable);
  const picks: DealPick[] = [];

  if (good.length) {
    const cheapest = Math.min(...good.map((p) => p.priceCents));
    const score = (p: Product) => 0.6 * reliability(p) + 0.4 * (cheapest / p.priceCents);
    const best = [...good].sort((a, b) => score(b) - score(a) || a.priceCents - b.priceCents)[0];
    const avg = Math.round(good.reduce((s, p) => s + p.priceCents, 0) / good.length);
    const saving = avg - best.priceCents;
    picks.push(pick(best, "Best overall", `${facts(best)}. ${saving > 0 ? `${formatAUD(saving)} below the average of trusted sellers.` : "Best balance of price and reliability."}`));
    const trusted = [...good].sort((a, b) => reliability(b) - reliability(a) || a.priceCents - b.priceCents)[0];
    if (trusted.id !== best.id)
      picks.push(pick(trusted, "Most trusted seller", `${facts(trusted)}, ${MERCHANTS[trusted.merchantId].deliveryDays}-day delivery. ${formatAUD(trusted.priceCents - best.priceCents)} more than the best overall.`));
  }

  const risky = all.filter((p) => !recommendable(p)).sort((a, b) => a.priceCents - b.priceCents)[0];
  if (risky && (!good.length || risky.priceCents < Math.min(...good.map((p) => p.priceCents))))
    picks.push(pick(risky, "Not recommended", `Cheapest at ${formatAUD(risky.priceCents)}, but ${facts(risky)}. We don't recommend this seller.`));

  const note = good.length ? null : `No trusted sellers have ${CATEGORY_LABEL[category].toLowerCase()}${maxPriceCents ? ` under ${formatAUD(maxPriceCents)}` : ""}.`;
  return { category, maxPriceCents, picks, note };
}
