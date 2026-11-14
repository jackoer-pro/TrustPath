import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAUD, toCents } from "./money.ts";

test("toCents parses common inputs", () => {
  assert.equal(toCents("1,500"), 150000);
  assert.equal(toCents("$300"), 30000);
  assert.equal(toCents("300.5"), 30050);
  assert.equal(toCents("120.00"), 12000);
  assert.equal(toCents(14.5), 1450);
});

test("toCents rejects non-amounts", () => {
  for (const bad of ["abc", "-5", "1.234", ""]) assert.throws(() => toCents(bad), bad);
});

test("formatAUD", () => {
  assert.equal(formatAUD(108000), "$1,080.00");
  assert.equal(formatAUD(1450), "$14.50");
});
