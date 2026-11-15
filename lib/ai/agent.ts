import "server-only";
import { audit } from "@/lib/audit";
import { chat, DeepSeekError, type LlmMessage } from "./deepseek";
import { SYSTEM_PROMPT } from "./prompts";
import { runFallback } from "./fallback";
import { EMERGENCY_REPLY, runTool, SAFETY_GUIDANCE, TOOL_DEFS, type ChatCard, type ToolContext } from "./tools";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type AgentResult = { reply: string; cards: ChatCard[]; offline: boolean };

export const MAX_ROUNDS = 4;
export const HISTORY_LIMIT = 12;

const CLAIM = /\b(I've|I have|I)\s+(just\s+)?(prepared|set up|queued)\b/i;
const claimsPrepared = (reply: string) => CLAIM.test(reply);
const preparedThisTurn = (tools: string[]) => tools.some((t) => t.startsWith("prepare_"));
const NUDGE =
  "You said you prepared something, but no prepare tool was called in this turn, so nothing exists. Earlier replies in the history are not actions. Call the prepare tool now for the customer's latest request, or say you haven't prepared anything.";

/** Bounded tool loop. Cards come only from tool results, never from model text. */
export async function runAgent(history: ChatMessage[]): Promise<AgentResult> {
  const recent = history.slice(-HISTORY_LIMIT);
  // ponytail: provenance trusts the client-sent history (the browser is the customer); keep history server-side for real users.
  const ctx: ToolContext = { userMessages: recent.filter((m) => m.role === "user").map((m) => m.content) };
  const messages: LlmMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...recent];
  const cards: ChatCard[] = [];
  const toolsUsed: string[] = [];
  let reply = "";
  let nudged = false;

  try {
    for (let round = 1; round <= MAX_ROUNDS; round++) {
      // Last round: no more tools, so the model has to answer.
      const msg = await chat({ messages, tools: TOOL_DEFS, toolChoice: round === MAX_ROUNDS ? "none" : "auto" });
      messages.push(msg);
      if (!msg.tool_calls?.length) {
        reply = msg.content ?? "";
        // Guard: the model must never claim a preparation that no tool made this turn (it copies earlier replies).
        if (claimsPrepared(reply) && !preparedThisTurn(toolsUsed) && !nudged && round < MAX_ROUNDS) {
          nudged = true;
          messages.push({ role: "system", content: NUDGE });
          continue;
        }
        break;
      }
      for (const call of msg.tool_calls) {
        const result = await runTool(call.function.name, call.function.arguments, ctx);
        toolsUsed.push(call.function.name);
        if (result.card) cards.push(result.card);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result.forModel) });
      }
    }
  } catch (e) {
    if (!(e instanceof DeepSeekError)) throw e;
    console.error(e.message);
    // Actions already prepared this turn: keep them, never re-run (no duplicates).
    // Same for emergency protection: keep its card rather than activating again offline.
    if (toolsUsed.some((t) => t.startsWith("prepare_") || t === "report_account_compromise")) {
      await audit("ai_agent", "chat.turn", "chat", null, { offline: true, partial: true, tools: toolsUsed, cards: cards.length });
      const reply = cards.some((c) => c.type === "emergency") ? `${EMERGENCY_REPLY} ${SAFETY_GUIDANCE}` : "I've prepared what you asked for below. Please review each one.";
      return { reply, cards, offline: true };
    }
    return runFallback(recent);
  }

  // Still claiming a preparation without a tool call: use the rule-based assistant, which always goes through the tools.
  if (claimsPrepared(reply) && !preparedThisTurn(toolsUsed)) {
    await audit("ai_agent", "chat.unbacked_claim", "chat", null, { reply: reply.slice(0, 200) });
    return runFallback(recent);
  }
  await audit("ai_agent", "chat.turn", "chat", null, { tools: toolsUsed, cards: cards.length });
  return { reply: reply || "I've prepared that for you to review below.", cards, offline: false };
}
