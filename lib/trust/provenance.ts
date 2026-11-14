// Intent provenance: an action's amount and recipient must come from the customer's own words.
// Pure: no DB, no framework imports.
import { toCents } from "../money.ts";

const SMALL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const TENS_HYPHEN = new RegExp(`\\b(${Object.keys(TENS).join("|")})-(${Object.keys(SMALL).slice(1, 10).join("|")})\\b`, "g");
const isNumberWord = (w: string) => w in SMALL || w in TENS || w === "hundred" || w === "thousand";

/** "one thousand five hundred" → "1500", "a hundred and fifty" → "150". Expects lower-case text. */
export function wordsToNumbers(text: string): string {
  const parts = text.replace(TENS_HYPHEN, "$1 $2").split(/(\s+)/); // words at even indexes
  const word = (i: number) => /^([a-z]+)(\W*)$/.exec(parts[i] ?? "");
  const out: string[] = [];

  let i = 0;
  while (i < parts.length) {
    let total = 0, current = 0, lastEnd = -1, trail = "";
    for (let j = i; j < parts.length; j += 2) {
      const m = word(j);
      if (!m) break;
      const [, w, punct] = m;
      const next = word(j + 2)?.[1] ?? "";
      if (w in SMALL || w in TENS) current += SMALL[w] ?? TENS[w];
      else if (w === "hundred") current = (current || 1) * 100;
      else if (w === "thousand") { total += (current || 1) * 1000; current = 0; }
      else if (w === "a" && !punct && (next === "hundred" || next === "thousand")) continue;
      else if (w === "and" && lastEnd >= 0 && !punct && isNumberWord(next)) continue;
      else break;
      lastEnd = j;
      trail = punct;
      if (punct) break; // punctuation ends the number
    }
    if (lastEnd >= 0) {
      out.push(String(total + current) + trail);
      if (lastEnd + 1 < parts.length) out.push(parts[lastEnd + 1]);
      i = lastEnd + 2;
    } else {
      out.push(parts[i]);
      if (i + 1 < parts.length) out.push(parts[i + 1]);
      i += 2;
    }
  }
  return out.join("");
}

/** Lower-case, "2k" → "2000", word-numbers → digits. */
export function normaliseMessages(messages: string[]): string {
  const text = messages.join("\n").toLowerCase().replace(/\b(\d+)k\b/g, (_, n: string) => String(Number(n) * 1000));
  return wordsToNumbers(text);
}

/** Whole amounts only: "$300", "300", "300.00", "1,500" — but 300 never matches inside 3000. */
export function amountMentioned(cents: number, text: string): boolean {
  const re = /(?<![\w.,])\$?(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?(?!\d|,\d|\.\d)/g;
  for (const m of text.matchAll(re)) if (toCents(m[1] + (m[2] ?? "")) === cents) return true;
  return false;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True if the raw recipient text or any alias appears as a whole word/phrase. */
export function recipientMentioned(aliases: string[], rawTo: string, text: string): boolean {
  return [rawTo, ...aliases]
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
    .some((c) => new RegExp(`(?<![a-z0-9])${escape(c)}(?![a-z0-9])`).test(text));
}

export type ProvenanceInput =
  | { type: "transfer"; amountCents: number; rawTo: string; recipientAliases: string[] }
  | { type: "purchase"; productTerms: string[] }; // URL, id, name — price comes from the catalogue

export type Provenance = { amountOk: boolean; recipientOk: boolean };

// ponytail: last-3-user-messages window, upgrade to provenance tracked per pending intent.
export const PROVENANCE_WINDOW = 3;

export function checkProvenance(action: ProvenanceInput, userMessages: string[]): Provenance {
  const text = normaliseMessages(userMessages.slice(-PROVENANCE_WINDOW));
  if (action.type === "purchase") {
    return { amountOk: true, recipientOk: recipientMentioned(action.productTerms, "", text) };
  }
  return {
    amountOk: amountMentioned(action.amountCents, text),
    recipientOk: recipientMentioned(action.recipientAliases, action.rawTo, text),
  };
}
