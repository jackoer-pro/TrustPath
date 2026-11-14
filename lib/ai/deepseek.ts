import "server-only";

// The only file that talks to DeepSeek (OpenAI-compatible API). Swap the provider here for a bank-approved host.
const URL = "https://api.deepseek.com/chat/completions";
const CHAT_TIMEOUT_MS = 12_000; // falls back to the offline parser while the camera is still rolling

export class DeepSeekError extends Error {}

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type LlmMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
export type ToolDef = { type: "function"; function: { name: string; description: string; parameters: object } };

export const deepseekModel = () => process.env.DEEPSEEK_MODEL || "deepseek-v4-pro";

export async function chat(opts: {
  messages: LlmMessage[];
  tools?: ToolDef[];
  toolChoice?: "auto" | "none";
  jsonMode?: boolean;
  timeoutMs?: number;
}): Promise<Extract<LlmMessage, { role: "assistant" }>> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new DeepSeekError("Missing env DEEPSEEK_API_KEY");

  let res: Response;
  try {
    res = await fetch(URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: deepseekModel(),
        messages: opts.messages,
        thinking: { type: "disabled" },
        temperature: 0,
        ...(opts.tools && { tools: opts.tools, tool_choice: opts.toolChoice ?? "auto" }),
        ...(opts.jsonMode && { response_format: { type: "json_object" } }),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? CHAT_TIMEOUT_MS),
    });
  } catch (e) {
    throw new DeepSeekError(`DeepSeek request failed: ${(e as Error).name}`);
  }
  if (!res.ok) throw new DeepSeekError(`DeepSeek HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const body = await res.json();
  const msg = body?.choices?.[0]?.message;
  if (!msg || (!msg.content && !msg.tool_calls?.length)) throw new DeepSeekError("DeepSeek returned an empty message");
  return { role: "assistant", content: msg.content ?? null, ...(msg.tool_calls?.length && { tool_calls: msg.tool_calls }) };
}
