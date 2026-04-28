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

/**
 * Streaming chat. Returns a ReadableStream of UTF-8 bytes containing only the
 * content tokens from each NDJSON frame, suitable for piping straight into a
 * Response body. Throws on a non-2xx upstream response.
 */
export async function chatStream(opts: OllamaChatOptions): Promise<ReadableStream<Uint8Array>> {
  const host = resolveHost(opts.host, opts.apiKey);
  const upstream = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(opts.apiKey),
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      format: opts.json ? 'json' : undefined,
      options: {
        temperature: opts.temperature ?? 0.3,
      },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => '');
    throw new Error(`Ollama ${upstream.status}: ${body.slice(0, 300)}`);
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buf = '';
      const flushLine = (line: string) => {
        if (!line) return;
        try {
          const obj = JSON.parse(line) as { message?: { content?: string } };
          const piece = obj.message?.content;
          if (piece) controller.enqueue(encoder.encode(piece));
        } catch {
          // ignore malformed line
        }
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl = buf.indexOf('\n');
          while (nl >= 0) {
            flushLine(buf.slice(0, nl).trim());
            buf = buf.slice(nl + 1);
            nl = buf.indexOf('\n');
          }
        }
        flushLine(buf.trim());
      } finally {
        controller.close();
      }
    },
  });
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
