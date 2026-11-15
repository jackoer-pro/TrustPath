// Rule-based intent parser for the offline assistant. Pure: no DB, no framework imports.
// It only proposes tool calls; every call still goes through runTool() → Zod → prepareTransfer → trust engine.
import { normaliseMessages } from "../trust/provenance.ts";
import { looksPasted } from "./paste.ts";
import { categoryOf } from "../shop/deals.ts";
import { getProduct } from "../shop/products.ts";

export type Known = { alias: string; display: string }; // e.g. { alias: "mum", display: "Mum" }
export type Call =
  | { name: "get_accounts"; args: Record<string, never> }
  | { name: "get_recent_transactions"; args: { limit: number } }
  | { name: "view_product"; args: { productIdOrUrl: string } }
  | { name: "prepare_purchase"; args: { productIdOrUrl: string } }
  | { name: "prepare_transfer"; args: { to: string; amount: string; fromAccount?: string } }
  | { name: "report_account_compromise"; args: { customerStatement: string } }
  | { name: "search_safety_guide"; args: { query: string } }
  | { name: "find_deals"; args: { query: string } }
  | { name: "buy_named_product"; args: { productIdOrUrl: string } }
  | { name: "prepare_payday_plan"; args: Record<string, never> }
  | { name: "get_safe_to_spend"; args: { amount?: string } }
  | { name: "get_financial_context"; args: Record<string, never> }
  | { name: "update_financial_preference"; args: { setting: "min_buffer" | "savings_target"; amount: string } };
export const PASTE_REPLY =
  "I won't act on instructions in a pasted message. If it asks you to move money, share a code or install an app, treat it as suspicious and call us on the number on the back of your card.";
export type ParseResult = { calls: Call[]; asks: string[]; wantsLeft: boolean };
type Msg = { role: "user" | "assistant"; content: string };

const AMOUNT = /\$?(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?/;
const LONE_AMOUNT = /^\s*\$?(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?\s*(dollars|bucks)?[.!]?\s*$/;
const MOVE = /\b(move|transfer|put|send|pay|give)\b/;
const FROM = /\bfrom\s+(?:my\s+)?([a-z ]+?)(?:\s+account)?(?=$|[,.!?]|\s+(?:to|into)\b)/;
const TRAILING = /\s+(urgently|now|please|today|asap|right away)$/;
/** Scam / compromise reports: protection comes first, so nothing else in the message is parsed. */
const COMPROMISE = /\b(scammed|hacked|security code|protect my (money|account)|wasn['’]t me|was not me|gave [^.]*\b(code|password|pin|card details))\b/;
/** Safety questions → the knowledge base (only when nothing else was understood). */
const SAFETY = /\b(scams?|safe|safety|blocked|held|why|fraud|suspicious)\b/;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Commas/periods between digits stay ("$1,500", "120.50"); everything else separates clauses. */
const clauses = (text: string) =>
  text
    .split(/(?<!\d),|,(?!\d)|\band\b|\bthen\b|[.!?](?!\d)/)
    .map((c) => c.trim())
    .filter(Boolean);

/** First known alias in the clause (by position), else the raw text after "to" for unknown recipients. */
function recipientIn(clause: string, known: Known[]): { to: string; display: string } | null {
  let best: { at: number; k: Known } | null = null;
  for (const k of known) {
    const m = new RegExp(`(?<![a-z0-9])${escape(k.alias)}(?![a-z0-9])`).exec(clause);
    if (m && (!best || m.index < best.at)) best = { at: m.index, k };
  }
  if (best) return { to: best.k.alias, display: best.k.display };
  const raw = /\b(?:to|into)\s+(.+)$/.exec(clause)?.[1].replace(TRAILING, "").trim();
  return raw ? { to: raw, display: raw } : null;
}

function parseClause(clause: string, known: Known[], out: ParseResult) {
  const from = FROM.exec(clause);
  const fromAccount = from?.[1].trim();
  const body = from ? clause.replace(from[0], " ") : clause;
  const amount = AMOUNT.exec(body);

  if (MOVE.test(body)) {
    const recipient = recipientIn(body.replace(AMOUNT, " "), known);
    if (amount && recipient) {
      out.calls.push({
        name: "prepare_transfer",
        args: { to: recipient.to, amount: amount[1] + (amount[2] ?? ""), ...(fromAccount && { fromAccount }) },
      });
    } else if (recipient) out.asks.push(`How much would you like to send ${recipient.display}?`);
    else out.asks.push("How much would you like to move, and to which of your accounts or saved payees?");
    return;
  }
  if (/\bleft\b/.test(body)) out.wantsLeft = true;
  else if (/\b(transactions?|spent|spend|spending)\b/.test(body)) out.calls.push({ name: "get_recent_transactions", args: { limit: 5 } });
  else if (/\b(balances?|how much (money )?do i have)\b/.test(body)) out.calls.push({ name: "get_accounts", args: {} });
}

export function parseIntents(history: Msg[], known: Known[]): ParseResult {
  const out: ParseResult = { calls: [], asks: [], wantsLeft: false };
  const last = history.at(-1);
  if (!last || last.role !== "user") return out;
  // A pasted message is third-party content: never acted on, and never locks the account on its own.
  if (looksPasted(last.content)) {
    out.asks.push(PASTE_REPLY);
    return out;
  }
  // "d. mercer" → "d mercer": an initial isn't the end of a sentence.
  const text = normaliseMessages([last.content]).replace(/\b([a-z])\.\s+(?=[a-z])/g, "$1 ");
  if (COMPROMISE.test(text)) {
    const statement = last.content.trim().slice(0, 1000);
    out.calls.push({ name: "report_account_compromise", args: { customerStatement: statement } });
    out.calls.push({ name: "search_safety_guide", args: { query: statement } });
    return out;
  }

  // Personal context (Unit 30–31): payday plan, safe-to-spend, affordability, preferences.
  if ((/\b(payday plan|usual payday|usual plan)\b/.test(text) || /\bdo my usual\s*[.!]?\s*$/.test(text))) {
    out.calls.push({ name: "prepare_payday_plan", args: {} });
    return out;
  }
  const pref = /\b(?:change|set|update|make|raise|lower)\s+my\s+(minimum\s+buffer|buffer|savings\s+(?:goal|target))\s+to\s+\$?(\d[\d,]*(?:\.\d{1,2})?)/.exec(text);
  if (pref) {
    out.calls.push({ name: "update_financial_preference", args: { setting: /buffer/.test(pref[1]) ? "min_buffer" : "savings_target", amount: pref[2].replace(/,/g, "") } });
    return out;
  }
  const afford = /\bcan i afford\b/.test(text) ? AMOUNT.exec(text) : null;
  if (afford) {
    out.calls.push({ name: "get_safe_to_spend", args: { amount: afford[1].replace(/,/g, "") + (afford[2] ?? "") } });
    return out;
  }
  if (/\b(safe to spend|what can i spend|how much can i spend|spend until payday|left to spend|spending money)\b/.test(text)) {
    out.calls.push({ name: "get_safe_to_spend", args: {} });
    return out;
  }
  if (/\bwhy\b[^.?!]*\b(sav(e|ing)|buffer|recommend)\b/.test(text) || /\b(my (financial )?(context|commitments|goals)|when is (my )?payday)\b/.test(text)) {
    out.calls.push({ name: "get_financial_context", args: {} });
    return out;
  }

  // "$200" after "How much would you like to send Mum?" → recipient from the previous customer message.
  const prevAssistant = history.at(-2);
  const lone = LONE_AMOUNT.exec(text);
  if (lone && prevAssistant?.role === "assistant" && /how much/i.test(prevAssistant.content)) {
    const prevUser = history.slice(0, -2).findLast((m) => m.role === "user");
    const recipient = prevUser && recipientIn(normaliseMessages([prevUser.content]), known);
    if (recipient) {
      out.calls.push({ name: "prepare_transfer", args: { to: recipient.to, amount: lone[1] + (lone[2] ?? "") } });
      return out;
    }
  }

  const shopLink = /\S*\/shop\/[a-z0-9-]+/.exec(text)?.[0];
  // In-app shop: "find me the best headphones under $150" → the deal finder (no link needed).
  // "Buy the QuietPro 700 Headphones": a named catalogue product → prepare it (the name is in the customer's words).
  const named = !shopLink && /\bbuy\s+(?:the\s+|a\s+|an\s+)?(.+?)[.!?]*$/.exec(text)?.[1];
  if (named && getProduct(named)) {
    out.calls.push({ name: "buy_named_product", args: { productIdOrUrl: named } });
    return out;
  }
  if (!shopLink && categoryOf(text) && /\b(find|search|looking for|best|cheapest|cheap|deal|deals|recommend|buy|need|want|good|any|options|which|show)\b/.test(text)) {
    out.calls.push({ name: "find_deals", args: { query: last.content.trim().slice(0, 200) } });
    return out;
  }
  if (shopLink) {
    out.calls.push({ name: "view_product", args: { productIdOrUrl: shopLink } });
    if (/\b(buy|order|purchase|get me)\b/.test(text)) out.calls.push({ name: "prepare_purchase", args: { productIdOrUrl: shopLink } });
  }

  for (const c of clauses(text)) parseClause(c, known, out);
  if (!out.calls.length && !out.asks.length && SAFETY.test(text)) out.calls.push({ name: "search_safety_guide", args: { query: last.content.trim().slice(0, 300) } });
  if (out.wantsLeft && !out.calls.some((c) => c.name === "prepare_transfer")) out.calls.push({ name: "get_accounts", args: {} });
  return out;
}
