/**
 * LLM client — OpenAI-compatible chat completions.
 * Defaults to Groq but works with any OpenAI-compatible endpoint
 * (Ollama, OpenAI, Anthropic-compat, etc.) via env config.
 */

const LLM_API_URL = process.env.LLM_API_URL ?? "https://api.groq.com/openai/v1";
const LLM_API_KEY = process.env.LLM_API_KEY ?? "";
const LLM_MODEL = process.env.LLM_MODEL ?? "llama-3.3-70b-versatile";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Force JSON object output (supported by Groq/OpenAI). */
  json?: boolean;
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const res = await fetch(`${LLM_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export { LLM_MODEL };
