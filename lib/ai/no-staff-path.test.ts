// Invariant 8: the AI has no path to unlock cards, lift restrictions, approve or close cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = import.meta.dirname;
const source = (f: string) => readFileSync(join(dir, f), "utf8");

test("no AI tool can unlock, resolve, lift, approve or review", () => {
  const names = [...source("tools.ts").matchAll(/\bname:\s*"([a-z_]+)"/g)].map((m) => m[1]);
  assert.ok(names.includes("prepare_transfer"), "tool names were found");
  for (const n of names) assert.doesNotMatch(n, /unlock|resolve|lift|approve|review/, n);
});

test("lib/ai never imports staff actions, approval or the resolve route", () => {
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
    const s = source(f);
    assert.doesNotMatch(s, /from\s+["'][^"']*(ops\/staff|banking\/approve|api\/ops)/, f);
    assert.doesNotMatch(s, /complete_action/, f);
  }
});
