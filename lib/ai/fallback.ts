import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { formatAUD } from "@/lib/money";
import { DEMO_PROFILE_ID } from "@/lib/banking/constants";
import type { PreparedAction } from "@/lib/banking/actions";
import type { ChatCard } from "./tools";
import { parseIntents, type Known } from "./fallback-parse";
import { runTool } from "./tools";
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

/** Rule-based stand-in for the LLM: same tools, same trust engine, templated reply. */
export async function runFallback(history: ChatMessage[]): Promise<AgentResult> {
  const parsed = parseIntents(history, await knownRecipients());
  const ctx = { userMessages: history.filter((m) => m.role === "user").map((m) => m.content) };
  const sentences: string[] = [];
  const reads: string[] = [];
  const cards: ChatCard[] = [];
  const actions: PreparedAction[] = [];
  let left = "";

  for (const call of parsed.calls) {
    const r = await runTool(call.name, JSON.stringify(call.args), ctx);
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
      reads.push(`I read the ${p.merchant} page for the ${p.name} (${p.price}).${p.notice ? " It contained hidden instructions, which I ignored." : ""}`);
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
