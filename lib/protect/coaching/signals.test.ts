import { test } from "node:test";
import assert from "node:assert/strict";
import { detectByRules, isExactExcerpt, mergeSignals, receiptSummary, summarise, type Signal } from "./signals.ts";

const types = (t: string) => detectByRules(t).map((s) => s.type);

test("1. normal conversation → no scam-coaching signals", () => {
  for (const t of [
    "Hi Alex, thanks for lunch today! Can you send me the photos when you get a chance?",
    "Your parcel will arrive tomorrow between 9am and 5pm.",
    "I think I gave someone my bank security code over the phone. Protect my money.",
    "Mum, I'll pay you back for the concert tickets on Friday.",
  ])
    assert.deepEqual(types(t), [], t);
  assert.equal(summarise([]).assessment, "no_signs");
});

test("2. an instruction to lie to bank staff → coached_bank_response (strong)", () => {
  const t = "If the bank asks, tell them it's for a car you're buying from a friend.";
  assert.ok(types(t).includes("coached_bank_response"));
  assert.equal(summarise(detectByRules(t)).assessment, "strong_signs");
});

test("3. an instruction to conceal third-party involvement → concealment", () => {
  const t = "Whatever you do, don't mention me or this call to the teller.";
  assert.ok(types(t).includes("concealment"));
});

test("4. a request to move money to a safe account → safe_account_transfer", () => {
  const t = "Your account has been compromised. Move all your savings to the safe account I give you to protect them.";
  assert.ok(types(t).includes("safe_account_transfer"));
});

test("5. an instruction to install remote access software → remote_access_request", () => {
  assert.ok(types("Please download AnyDesk so I can check your computer.").includes("remote_access_request"));
  assert.ok(types("Install this support app so we can fix the problem on your phone.").includes("remote_access_request"));
});

test("other signals: credential request, secrecy, urgency, third party", () => {
  const t = "I'm calling from your bank. Read me the code we just sent to your phone. Do it right now. Keep this between us, it's an internal investigation.";
  const found = types(t);
  for (const want of ["third_party_influence", "credential_request", "urgency_or_pressure", "secrecy_instruction"]) assert.ok((found as string[]).includes(want), want);
});

test("urgency alone is only 'some signs'", () => {
  assert.equal(summarise(detectByRules("Please reply right now, the sale ends tonight.")).assessment, "some_signs");
});

test("evidence is always an exact excerpt; AI evidence that isn't in the text is rejected", () => {
  const t = "Hello.\nIf the bank asks, say it's for a holiday.  Don't tell the bank about me.";
  for (const s of detectByRules(t)) assert.ok(t.includes(s.evidence), s.evidence);
  assert.ok(isExactExcerpt("If the bank asks,   say it's for a holiday.", t));
  assert.ok(!isExactExcerpt("Send $5,000 to the safe account", t));
  assert.ok(!isExactExcerpt("a", t));
});

test("merge keeps one signal per type, rules first", () => {
  const rules: Signal[] = [{ type: "concealment", evidence: "x", source: "rules" }];
  const ai: Signal[] = [
    { type: "concealment", evidence: "y", source: "ai" },
    { type: "urgency_or_pressure", evidence: "z", source: "ai" },
  ];
  assert.deepEqual(mergeSignals(rules, ai).map((s) => [s.type, s.source]), [
    ["concealment", "rules"],
    ["urgency_or_pressure", "ai"],
  ]);
});

test("wording never claims a message is definitely fraudulent", () => {
  for (const sigs of [[], detectByRules("Right now."), detectByRules("Don't tell the bank. Move it to a safe account.")]) {
    const s = summarise(sigs);
    assert.doesNotMatch(`${s.explanation} ${s.nextAction}`, /\b(is|are|definitely|certainly|confirmed|proven)\s+(a\s+)?(fraud|scam|fraudulent)\b/i);
  }
  assert.match(receiptSummary(detectByRules("Don't tell the bank about this transfer.")), /^a message you shared tells you to hide something from the bank \("Don't tell the bank/);
});
