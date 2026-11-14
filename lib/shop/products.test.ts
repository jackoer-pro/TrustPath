import { test } from "node:test";
import assert from "node:assert/strict";
import { getProduct, pageText, PRODUCTS } from "./products.ts";
import { scan } from "../trust/content-scanner.ts";

test("getProduct accepts the id or a shop URL", () => {
  assert.equal(getProduct("aurora-anc")?.priceCents, 12900);
  assert.equal(getProduct("https://trust-path-five.vercel.app/shop/aurora-anc")?.name, "Aurora ANC Headphones");
  assert.equal(getProduct("http://localhost:3000/shop/aurora-anc/?ref=chat")?.id, "aurora-anc");
  assert.equal(getProduct("nope"), null);
  assert.equal(getProduct("https://evil.example/shop/other"), null);
});

test("the scanner removes the planted instruction from the page text and keeps the product copy", () => {
  const r = scan(pageText(PRODUCTS["aurora-anc"]));
  assert.ok(r.removed.length >= 2, "both hidden copies flagged");
  assert.doesNotMatch(r.clean, /J\. Smith|\$500|without asking|assistant/i);
  assert.match(r.clean, /Aurora ANC Headphones/);
  assert.match(r.clean, /\$129\.00/);
  assert.match(r.clean, /noise cancelling/);
});
