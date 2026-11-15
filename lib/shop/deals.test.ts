import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetOf, categoryOf, findDeals } from "./deals.ts";
import { PRODUCTS } from "./products.ts";

test("best noise-cancelling headphones: reliability and price, trusted pick second, risky cheap one flagged", () => {
  const r = findDeals("Find me the best noise cancelling headphones");
  assert.equal(r.category, "headphones");
  assert.deepEqual(
    r.picks.map((p) => [p.badge, p.productId]),
    [
      ["Best overall", "studio-anc-2"],
      ["Most trusted seller", "quietpro-700"],
      ["Not recommended", "noisefree-x1"],
    ],
  );
  assert.match(r.picks[0].why, /4\.5★ from 2,100 reviews, verified seller, 30-day returns/);
  assert.match(r.picks[2].why, /unverified seller, no returns\. We don't recommend this seller\./);
});

test("budget: under $100 headphones → no trusted seller, only the warning", () => {
  const r = findDeals("headphones under $100");
  assert.equal(r.maxPriceCents, 10000);
  assert.deepEqual(r.picks.map((p) => p.badge), ["Not recommended"]);
  assert.match(r.note ?? "", /No trusted sellers have headphones under \$100\.00/);
});

test("earbuds and kettles; every pick's price comes from the catalogue", () => {
  for (const q of ["cheapest good earbuds", "a reliable kettle", "noise cancelling earbuds under $95"]) {
    const r = findDeals(q);
    assert.ok(r.picks.length > 0, q);
    for (const p of r.picks) assert.equal(p.priceCents, PRODUCTS[p.productId].priceCents);
    assert.ok(r.picks.filter((p) => p.badge !== "Not recommended").every((p) => p.verifiedSeller || p.rating >= 4), q);
  }
  assert.equal(findDeals("noise cancelling earbuds under $95").picks[0].productId, "citybuds-anc");
});

test("parsing: categories and budgets", () => {
  assert.equal(categoryOf("noise-cancelling earbuds"), "earbuds");
  assert.equal(categoryOf("Over-ear headphones"), "headphones");
  assert.equal(categoryOf("a laptop"), null);
  assert.equal(budgetOf("below $59.50"), 5950);
  assert.equal(budgetOf("best headphones"), null);
  assert.equal(findDeals("a laptop").picks.length, 0);
});

test("getProduct by name: exact or unique partial; ambiguous or short → null; ids and links unchanged", async () => {
  const { getProduct } = await import("./products.ts");
  assert.equal(getProduct("QuietPro 700 Headphones")?.id, "quietpro-700");
  assert.equal(getProduct("the quietpro 700")?.id, "quietpro-700");
  assert.equal(getProduct("headphones"), null, "ambiguous");
  assert.equal(getProduct("anc"), null, "too short");
  assert.equal(getProduct("https://x.app/shop/aurora-anc")?.id, "aurora-anc");
  assert.equal(getProduct("aurora-anc")?.priceCents, 12900);
});
