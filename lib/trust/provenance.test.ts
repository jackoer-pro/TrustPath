import { test } from "node:test";
import assert from "node:assert/strict";
import { amountMentioned, checkProvenance, normaliseMessages, recipientMentioned, wordsToNumbers } from "./provenance.ts";

test("word-numbers become digits", () => {
  assert.equal(wordsToNumbers("send mum two hundred dollars"), "send mum 200 dollars");
  assert.equal(wordsToNumbers("one thousand five hundred"), "1500");
  assert.equal(wordsToNumbers("a hundred and fifty bucks"), "150 bucks");
  assert.equal(wordsToNumbers("twenty-five"), "25");
  assert.equal(wordsToNumbers("fifty bucks"), "50 bucks");
  assert.equal(wordsToNumbers("nine hundred ninety-nine thousand nine hundred ninety-nine"), "999999");
  assert.equal(wordsToNumbers("pay three hundred."), "pay 300.");
  assert.equal(wordsToNumbers("bread and butter"), "bread and butter");
  assert.equal(wordsToNumbers("a cat"), "a cat");
});

test("normalise: lower-case and 2k", () => {
  assert.equal(normaliseMessages(["Send Mum $2k"]), "send mum $2000");
});

test("amounts: formats that match", () => {
  assert.ok(amountMentioned(30000, "move $300 into savings"));
  assert.ok(amountMentioned(30000, "move 300 into savings"));
  assert.ok(amountMentioned(30000, "move 300.00 into savings"));
  assert.ok(amountMentioned(150000, "i got paid 1,500."));
  assert.ok(amountMentioned(150000, "i got paid $1,500."));
  assert.ok(amountMentioned(12050, "it was $120.50"));
});

test("amounts: whole numbers only", () => {
  assert.ok(!amountMentioned(30000, "move $3000 into savings"));
  assert.ok(!amountMentioned(30000, "move 1300 into savings"));
  assert.ok(!amountMentioned(50000, "buy these headphones for $129"));
});

test("recipients: aliases and raw text as whole words", () => {
  assert.ok(recipientMentioned(["mum", "mom", "linh"], "Mum", "send mum $200"));
  assert.ok(recipientMentioned(["savings", "goal saver"], "my savings account", "move $300 into savings"));
  assert.ok(recipientMentioned([], "a new recipient", "send $10,000 to a new recipient urgently"));
  assert.ok(!recipientMentioned(["mum"], "Mum", "send it to my mummy"));
  assert.ok(!recipientMentioned([], "J. Smith", "buy these headphones for $129"));
});

test("checkProvenance: transfer uses last 3 user messages only", () => {
  const mum = { type: "transfer" as const, amountCents: 20000, rawTo: "Mum", recipientAliases: ["mum", "linh"] };
  assert.deepEqual(checkProvenance(mum, ["Send Mum some money", "$200"]), { amountOk: true, recipientOk: true });
  assert.deepEqual(checkProvenance(mum, ["Send Mum two hundred dollars from my everyday account."]), { amountOk: true, recipientOk: true });
  // amount said 4 messages ago is out of the window
  assert.equal(checkProvenance(mum, ["$200", "hi", "thanks", "send mum the money"]).amountOk, false);
});

test("checkProvenance: purchase needs the product, not the amount", () => {
  const p = { type: "purchase" as const, productTerms: ["https://x.app/shop/aurora-anc", "aurora-anc", "aurora anc headphones"] };
  assert.deepEqual(checkProvenance(p, ["Buy these headphones for $129 https://x.app/shop/aurora-anc"]), { amountOk: true, recipientOk: true });
  assert.equal(checkProvenance(p, ["buy me something nice"]).recipientOk, false);
});

test("hijack: $500 to J. Smith never matches the headphones message", () => {
  const hijack = { type: "transfer" as const, amountCents: 50000, rawTo: "J. Smith", recipientAliases: [] };
  assert.deepEqual(checkProvenance(hijack, ["Buy these headphones for $129 https://x.app/shop/aurora-anc"]), { amountOk: false, recipientOk: false });
});
