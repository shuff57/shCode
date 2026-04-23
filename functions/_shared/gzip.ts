/**
 * Gzip helpers for Cloudflare Workers.
 *
 * Workers expose CompressionStream / DecompressionStream as globals, and
 * Response.body / new Response(ReadableStream) as the idiomatic way to
 * collect streamed bytes.  ReadableStream.from() is NOT available in the
 * Workers runtime, so we drive the stream manually via a TransformStream
 * or the Response(body) collector pattern.
 */

/**
 * Serialize `value` to JSON, gzip-compress it, and return the compressed
 * bytes as a Uint8Array ready to bind as a D1 BLOB.
 */
export async function gzipJson(value: unknown): Promise<Uint8Array> {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(value));

  // Pipe through CompressionStream('gzip').
  // We feed bytes in via a ReadableStream constructed from a single chunk,
  // then collect the compressed output with Response.arrayBuffer().
  const cs = new CompressionStream('gzip');

  const inputStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(jsonBytes);
      controller.close();
    },
  });

  inputStream.pipeTo(cs.writable).catch(() => {
    /* suppress — errors surface on the readable side */
  });

  const compressed = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(compressed);
}

/**
 * Decompress gzipped bytes (ArrayBuffer or Uint8Array) and parse the
 * result as JSON.  D1 returns BLOBs as ArrayBuffer, so we accept both.
 */
export async function gunzipJson<T = unknown>(buf: ArrayBuffer | Uint8Array): Promise<T> {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);

  const ds = new DecompressionStream('gzip');

  const inputStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

  inputStream.pipeTo(ds.writable).catch(() => {
    /* suppress — errors surface on the readable side */
  });

  const decompressed = await new Response(ds.readable).arrayBuffer();
  const json = new TextDecoder().decode(decompressed);
  return JSON.parse(json) as T;
}
