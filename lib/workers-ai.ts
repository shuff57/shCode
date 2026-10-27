/**
 * Cloudflare Workers AI through the Pages `AI` binding: the transport every AI call in the app
 * uses (the grader and the Check button in functions/api/grade-written.ts, the tutor and the
 * flowchart hints in functions/api/ai-help.ts). Ollama (lib/ollama.ts) is only the fallback for a
 * deploy or dev server that has no binding.
 *
 * Kept free of imports so a Pages Function and a test can both load it.
 */

/** The model every AI call uses unless an env var or a lesson's own @cf/ id says otherwise. */
export const DEFAULT_WORKERS_MODEL = '@cf/google/gemma-4-26b-a4b-it';

/** The Workers AI binding, narrowed to the one method the app uses (so a Function does not pin
 *  itself to a workers-types version). */
export interface WorkersAi {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export interface WorkersChatOptions {
  ai: WorkersAi;
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  /** Generous on purpose: see the max_tokens note in functions/api/grade-written.ts. */
  maxTokens?: number;
}

const START_TIMEOUT_MS = 60_000;

/** One token's text out of a Workers AI stream frame. Models answer either `{ response }` or an
 *  OpenAI-shaped `{ choices: [{ delta: { content } }] }`; reasoning text is never shown. */
function pieceOf(frame: unknown): string {
  if (!frame || typeof frame !== 'object') return '';
  const f = frame as {
    response?: unknown;
    choices?: Array<{ delta?: { content?: unknown }; message?: { content?: unknown } }>;
  };
  if (typeof f.response === 'string') return f.response;
  const c = f.choices?.[0];
  const text = c?.delta?.content ?? c?.message?.content;
  return typeof text === 'string' ? text : '';
}

/**
 * Streaming chat. Returns a ReadableStream of UTF-8 bytes holding only the model's content tokens,
 * the same shape lib/ollama.ts's chatStream returns, so a caller can swap one for the other.
 * Throws if the binding fails before the first token.
 */
export async function workersChatStream(opts: WorkersChatOptions): Promise<ReadableStream<Uint8Array>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const out = await Promise.race([
    opts.ai.run(opts.model || DEFAULT_WORKERS_MODEL, {
      messages: opts.messages,
      stream: true,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1500,
      chat_template_kwargs: { enable_thinking: false },
    }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Workers AI timed out.')), START_TIMEOUT_MS);
    }),
  ]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });

  const encoder = new TextEncoder();

  // A binding (or a test double) that answers with the whole reply instead of a stream.
  if (!(out && typeof (out as ReadableStream).getReader === 'function')) {
    const text = typeof out === 'string' ? out : pieceOf(out);
    if (!text) throw new Error('Workers AI returned no content.');
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  }

  const reader = (out as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buf = '';
      const flush = (line: string) => {
        if (!line.startsWith('data:')) return;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') return;
        try {
          const piece = pieceOf(JSON.parse(payload));
          if (piece) controller.enqueue(encoder.encode(piece));
        } catch {
          // a partial or malformed frame; the next one carries on
        }
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl = buf.indexOf('\n');
          while (nl >= 0) {
            flush(buf.slice(0, nl).trim());
            buf = buf.slice(nl + 1);
            nl = buf.indexOf('\n');
          }
        }
        flush(buf.trim());
      } finally {
        controller.close();
      }
    },
  });
}
