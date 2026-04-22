/**
 * Ollama client — works against both a local daemon (http://localhost:11434)
 * and Ollama's hosted cloud API (https://ollama.com). Pass an apiKey to use
 * the cloud; the call adds `Authorization: Bearer <key>` automatically.
 *
 * This module is imported from both the Next.js route handler (where
 * process.env is available) and a Cloudflare Pages Function (where it
 * isn't). Don't read process.env at module load — callers pass host/apiKey
 * explicitly.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  host?: string;
  apiKey?: string;
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

function resolveHost(host: string | undefined, apiKey: string | undefined): string {
  if (host) return host;
  // If a key is provided, default to the cloud; otherwise default to local.
  return apiKey ? 'https://ollama.com' : 'http://localhost:11434';
}

function authHeaders(apiKey: string | undefined): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export async function chat(opts: OllamaChatOptions): Promise<OllamaChatResponse> {
  const host = resolveHost(opts.host, opts.apiKey);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);

  try {
    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(opts.apiKey),
      },
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

export async function isReachable(
  host?: string,
  apiKey?: string,
  timeoutMs = 2000,
): Promise<boolean> {
  const resolved = resolveHost(host, apiKey);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${resolved}/api/tags`, {
      signal: controller.signal,
      headers: authHeaders(apiKey),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
