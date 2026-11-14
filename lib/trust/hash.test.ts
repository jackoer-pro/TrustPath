import { test } from "node:test";
import assert from "node:assert/strict";
import { payloadHash } from "./hash.ts";

const f = { actionId: "a1", type: "transfer" as const, fromAccountId: "acc1", toAccountId: "acc2", amountCents: 30000 };

test("hash is 64 hex chars and stable regardless of key order", () => {
  const h = payloadHash(f);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(payloadHash({ amountCents: 30000, toAccountId: "acc2", fromAccountId: "acc1", type: "transfer", actionId: "a1" }), h);
  assert.equal(payloadHash({ ...f, payeeId: null, productId: undefined }), h);
});

test("any field change changes the hash", () => {
  const h = payloadHash(f);
  for (const changed of [
    { ...f, actionId: "a2" },
    { ...f, amountCents: 30001 },
    { ...f, toAccountId: "acc3" },
    { ...f, fromAccountId: "acc9" },
    { ...f, toAccountId: null, payeeId: "acc2" },
    { ...f, type: "purchase" as const },
  ]) assert.notEqual(payloadHash(changed), h);
});
