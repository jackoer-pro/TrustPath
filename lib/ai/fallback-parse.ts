// Rule-based intent parser for the offline assistant. Pure: no DB, no framework imports.
// It only proposes tool calls; every call still goes through runTool() → Zod → prepareTransfer → trust engine.
import { normaliseMessages } from "../trust/provenance.ts";

export type Known = { alias: string; display: string }; // e.g. { alias: "mum", display: "Mum" }
export type Call =
  | { name: "get_accounts"; args: Record<string, never> }
  | { name: "get_recent_transactions"; args: { limit: number } }
  | { name: "view_product"; args: { productIdOrUrl: string } }
  | { name: "prepare_purchase"; args: { productIdOrUrl: string } }
  | { name: "prepare_transfer"; args: { to: string; amount: string; fromAccount?: string } }
  | { name: "report_account_compromise"; args: { customerStatement: string } }
  | { name: "search_safety_guide"; args: { query: string } };
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
  const text = normaliseMessages([last.content]);
  if (COMPROMISE.test(text)) {
    const statement = last.content.trim().slice(0, 1000);
    out.calls.push({ name: "report_account_compromise", args: { customerStatement: statement } });
    out.calls.push({ name: "search_safety_guide", args: { query: statement } });
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
  if (shopLink) {
    out.calls.push({ name: "view_product", args: { productIdOrUrl: shopLink } });
    if (/\b(buy|order|purchase|get me)\b/.test(text)) out.calls.push({ name: "prepare_purchase", args: { productIdOrUrl: shopLink } });
  }

  for (const c of clauses(text)) parseClause(c, known, out);
  if (!out.calls.length && !out.asks.length && SAFETY.test(text)) out.calls.push({ name: "search_safety_guide", args: { query: last.content.trim().slice(0, 300) } });
  if (out.wantsLeft && !out.calls.some((c) => c.name === "prepare_transfer")) out.calls.push({ name: "get_accounts", args: {} });
  return out;
}
