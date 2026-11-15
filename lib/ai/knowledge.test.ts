import { test } from "node:test";
import assert from "node:assert/strict";
import { DOCS, searchSafety } from "./knowledge.ts";
import { scan } from "../trust/content-scanner.ts";

const ids = (q: string) => searchSafety(q).map((d) => d.id);

test("step 12 sentence → 'What we'll never ask for' in the top 2", () => {
  assert.ok(ids("I think I gave someone my bank security code over the phone. Protect my money.").includes("what-we-wont-ask"));
});

test("'Why was my payment blocked?' → held-or-blocked first", () => {
  assert.equal(ids("Why was my payment blocked?")[0], "held-or-blocked");
});

test("'How do I spot a scam?' → impersonation scams first", () => {
  assert.equal(ids("How do I spot a scam?")[0], "impersonation-scams");
});

test("nonsense and stop-words only → no results; never more than 2", () => {
  assert.deepEqual(ids("zzzz qqqq"), []);
  assert.deepEqual(ids("what is the"), []);
  assert.ok(searchSafety("scam code card blocked fraud report").length <= 2);
});

test("no doc trips the content scanner (nothing would be stripped)", () => {
  for (const d of DOCS) assert.deepEqual(scan(d.body).removed, [], d.id);
});
