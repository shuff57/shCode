/**
 * Minimal Ollama client for auto-grading written work.
 * Calls POST /api/chat with format: "json" so the model returns structured output.
 * Default endpoint: http://localhost:11434 — override with OLLAMA_HOST env var.
 */

const DEFAULT_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  host?: string;
  timeoutMs?: number;
  /** When true, request format: "json" for structured output. */
  json?: boolean;
}

export interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

export async function chat(opts: OllamaChatOptions): Promise<OllamaChatResponse> {
  const host = opts.host || DEFAULT_HOST;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);

  try {
    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: false,
        format: opts.json ? 'json' : undefined,
        options: {
          temperature: opts.temperature ?? 0.3,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama ${res.status}: ${body.slice(0, 300)}`);
    }

    return (await res.json()) as OllamaChatResponse;
  } finally {
    clearTimeout(t);
  }
}

export async function isReachable(host = DEFAULT_HOST, timeoutMs = 2000): Promise<boolean> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${host}/api/tags`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
