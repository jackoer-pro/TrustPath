import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { formatAUD } from "@/lib/money";
import { DEMO_PROFILE_ID } from "@/lib/banking/constants";
import type { PreparedAction } from "@/lib/banking/actions";
import type { ChatCard, ToolContext } from "./tools";
import { parseIntents, type Known } from "./fallback-parse";
import { looksPasted, ownWords } from "./paste";
import { EMERGENCY_REPLY, runTool, SAFETY_GUIDANCE } from "./tools";
import type { AgentResult, ChatMessage } from "./agent";

export const OFFLINE_HELP =
  "I'm in offline mode. I can show your balances, move money between your accounts, and pay Mum or your saved bills.";

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

async function knownRecipients(): Promise<Known[]> {
  const [accounts, payees] = await Promise.all([
    db().from("accounts").select("name, aliases").eq("profile_id", DEMO_PROFILE_ID),
    db().from("payees").select("name, aliases, kind").eq("profile_id", DEMO_PROFILE_ID),
  ]);
  if (accounts.error) throw accounts.error;
  if (payees.error) throw payees.error;
  return [
    ...accounts.data.flatMap((a) => [a.name.toLowerCase(), ...(a.aliases as string[])].map((alias) => ({ alias, display: a.name as string }))),
    ...payees.data.flatMap((p) =>
      [p.name.toLowerCase(), ...(p.aliases as string[])].map((alias) => ({
        alias,
        display: p.kind === "person" ? capitalise(alias) : (p.name as string),
      })),
    ),
  ];
}

type AccountsOut = { accounts: { name: string; balance: string }[] };
type TxOut = { description: string; amount: string }[];
type PrepareOut = { fromAccountLeftAfterPending: string };
type ProductOut = { merchant: string; name: string; price: string; notice?: string };
type ErrorOut = { error: string };
type SafetyOut = { results: { content: string }[]; latestBlocked: { status: string; amount: string; to?: string; reasons: string[] } | null };

/** Rule-based stand-in for the LLM: same tools, same trust engine, templated reply. */
/** True when the rule-based parser reads the latest message as a clear transfer or purchase request. */
/** Requests whose answer must come from a deterministic tool (money moves or money numbers), never from model text. */
const MUST_USE: Record<string, string> = {
  prepare_transfer: "prepare_transfer",
  prepare_purchase: "prepare_purchase",
  buy_named_product: "prepare_purchase",
  prepare_payday_plan: "prepare_payday_plan",
  get_safe_to_spend: "get_safe_to_spend",
  update_financial_preference: "update_financial_preference",
};

/** The deterministic tool the rule-based parser says this message needs, or null. */
export async function expectedTool(history: ChatMessage[]): Promise<string | null> {
  const calls = parseIntents(history, await knownRecipients()).calls;
  const hit = calls.find((c) => c.name in MUST_USE);
  return hit ? MUST_USE[hit.name] : null;
}

export async function runFallback(history: ChatMessage[]): Promise<AgentResult> {
  const parsed = parseIntents(history, await knownRecipients());
  const last = history.at(-1);
  const ctx: ToolContext = {
    userMessages: ownWords(history.filter((m) => m.role === "user").map((m) => m.content)),
    pasted: last?.role === "user" && looksPasted(last.content) ? last.content : undefined,
  };
  const sentences: string[] = [];
  const reads: string[] = [];
  const cards: ChatCard[] = [];
  const actions: PreparedAction[] = [];
  let left = "";

  for (const call of parsed.calls) {
    const tool = call.name === "buy_named_product" ? "prepare_purchase" : call.name;
    const r = await runTool(tool, JSON.stringify(call.args), ctx);
    const out = r.forModel as Partial<ErrorOut>;
    if (out.error) sentences.push(out.error);
    else if (call.name === "get_accounts") {
      const { accounts } = r.forModel as AccountsOut;
      sentences.push(`You have ${list(accounts.map((a) => `${a.balance} in ${a.name}`))}.`);
    } else if (call.name === "get_recent_transactions") {
      const tx = r.forModel as TxOut;
      sentences.push(`Your latest transactions: ${list(tx.slice(0, 3).map((t) => `${t.description} ${t.amount}`))}.`);
    } else if (call.name === "view_product") {
      const p = r.forModel as ProductOut;
      reads.push(`I read the ${p.merchant} page for the ${p.name} (${p.price}).${p.notice ? " The page also had hidden instructions; I ignored them." : ""}`);
      if (r.card) cards.push(r.card);
    } else if (call.name === "get_safe_to_spend") {
      const s = r.forModel as { explanation: string; affordability?: string };
      sentences.push(s.affordability ?? s.explanation);
      if (r.card) cards.push(r.card);
    } else if (call.name === "get_financial_context") {
      const c = r.forModel as { savingsGoal: string; minimumBuffer: string; nextPayday: string };
      sentences.push(`${c.savingsGoal} Your minimum buffer is ${c.minimumBuffer}, and your next payday is ${new Date(c.nextPayday + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long" })}.`);
    } else if (call.name === "update_financial_preference") {
      const u = r.forModel as { changed: string; safeToSpendNow: string };
      sentences.push(`Done. ${u.changed}. You can now safely spend ${u.safeToSpendNow} until payday.`);
      if (r.card) cards.push(r.card);
    } else if (call.name === "prepare_payday_plan") {
      const p = r.forModel as { prepared: { to: string; amount: string; status: string }[]; safeToSpendAfter: string };
      sentences.push(
        p.prepared.length
          ? `I've prepared your usual payday plan: ${list(p.prepared.map((x) => `${x.amount} to ${x.to}`))}. Approve each receipt below. You can still safely spend ${p.safeToSpendAfter} until payday.`
          : "Your payday plan is already done or waiting for approval this pay cycle.",
      );
      if (r.card) cards.push(r.card);
      for (const c of r.cards ?? []) cards.push(c);
    } else if (call.name === "find_deals") {
      const d = r.forModel as { picks: { badge: string; product: string; merchant: string; price: string; why: string }[]; note: string | null };
      const top = d.picks.find((p) => p.badge !== "Not recommended");
      if (d.note) sentences.push(d.note);
      if (top) sentences.push(`Best overall: the ${top.product} from ${top.merchant} at ${top.price}. ${top.why} Tap Buy to prepare it.`);
      if (r.card) cards.push(r.card);
    } else if (call.name === "check_message_for_scam_coaching") {
      const c = r.forModel as { explanation: string; nextAction: string; paymentsHeld: { amount: string; to: string }[] };
      sentences.push(c.explanation, c.nextAction);
      for (const h of c.paymentsHeld) sentences.push(`I've put your ${h.amount} payment to ${h.to} on hold until our team speaks with you.`);
      if (r.card) cards.push(r.card);
    } else if (call.name === "search_safety_guide") {
      const s = r.forModel as SafetyOut;
      const emergency = cards.some((c) => c.type === "emergency");
      if (emergency) sentences.push(SAFETY_GUIDANCE);
      else {
        const b = s.latestBlocked;
        if (b && /\b(blocked|held|why)\b/i.test(call.args.query))
          sentences.push(`Your ${b.amount} payment${b.to ? ` to ${b.to}` : ""} was ${b.status}: ${b.reasons[0]}`);
        const top = s.results[0]?.content.replace(/<\/?untrusted_content[^>]*>/g, "");
        if (top) sentences.push(top.split(/(?<=\.)\s+/).slice(0, 2).join(" "));
      }
      if (r.card) cards.push(r.card);
    } else if (call.name === "report_account_compromise") {
      sentences.push(EMERGENCY_REPLY);
      if (r.card) cards.push(r.card);
    } else if (r.card?.type === "receipt") {
      cards.push(r.card);
      actions.push(r.card.action);
      left = (r.forModel as PrepareOut).fromAccountLeftAfterPending;
    }
  }

  const fmt = (c: PreparedAction) => `${formatAUD(c.amountCents)} ${c.type === "purchase" ? "at" : "to"} ${c.toName}`;
  const pending = actions.filter((c) => c.status === "pending_approval");
  sentences.unshift(...reads);
  if (pending.length)
    sentences.push(
      `I've prepared ${pending.length === 1 ? "1 action" : `${pending.length} actions`}: ${list(pending.map(fmt))}.` +
        (left ? ` You'll have ${left.replace(" in ", " left in ")}.` : ""),
    );
  for (const c of actions.filter((c) => c.status === "blocked")) sentences.push(`I couldn't prepare ${fmt(c)}: ${c.reasons[0]}`);
  for (const c of actions.filter((c) => c.status === "held")) sentences.push(`${capitalise(fmt(c))} is held for review by our team.`);
  sentences.push(...parsed.asks);

  await audit("ai_agent", "chat.turn", "chat", null, { offline: true, tools: parsed.calls.map((c) => c.name), cards: cards.length });
  return { reply: sentences.join(" ") || OFFLINE_HELP, cards, offline: true };
}
