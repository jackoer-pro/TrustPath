import { test } from "node:test";
import assert from "node:assert/strict";
import { blocks, plainText, segments } from "./rich-text.ts";

const REPLY = "Here are your balances:\n- **Everyday** (…5678): $1,381.00\n- **Goal Saver** (…4321): $4,200.00\n\nNote: outgoing payments are currently paused.";

test("the balance reply becomes a paragraph, a two-item list and a paragraph; bold is marked, no asterisks", () => {
  const b = blocks(REPLY);
  assert.deepEqual(b.map((x) => [x.list, x.lines.length]), [
    [false, 1],
    [true, 2],
    [false, 1],
  ]);
  assert.deepEqual(segments(b[1].lines[0]), [
    { bold: true, text: "Everyday" },
    { bold: false, text: " (…5678): $1,381.00" },
  ]);
});

test("inline bullets on one line are split into a list", () => {
  const b = blocks("Here are your balances: - **Everyday** (…5678): $1,500.00 - **Goal Saver** (…4321): $4,200.00");
  assert.deepEqual(b.map((x) => [x.list, x.lines]), [
    [false, ["Here are your balances:"]],
    [true, ["**Everyday** (…5678): $1,500.00", "**Goal Saver** (…4321): $4,200.00"]],
  ]);
});

test("plain text for speech: no symbols, items as sentences; ordinary text and hyphens untouched", () => {
  assert.equal(plainText(REPLY), "Here are your balances: Everyday (…5678): $1,381.00. Goal Saver (…4321): $4,200.00. Note: outgoing payments are currently paused.");
  assert.equal(plainText("I've prepared a $50 transfer to Mum."), "I've prepared a $50 transfer to Mum.");
  assert.deepEqual(blocks("Pay-day is on Friday - see you then."), [{ list: false, lines: ["Pay-day is on Friday - see you then."] }]);
  assert.equal(plainText("## Heading with `code` and *emphasis*"), "Heading with code and emphasis.");
});
