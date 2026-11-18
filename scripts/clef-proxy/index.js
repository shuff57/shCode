// POST {model, inputs} -> env.AI.run(model, inputs). Local dev only: no auth, never deploy this.
export default {
  async fetch(req, env) {
    if (req.method !== 'POST') return new Response('POST {model, inputs}', { status: 405 });
    const { model, inputs } = await req.json();
    const t0 = Date.now();
    try {
      const out = await env.AI.run(model, inputs);
      return Response.json({ ok: true, ms: Date.now() - t0, out });
    } catch (e) {
      return Response.json({ ok: false, ms: Date.now() - t0, error: String((e && e.message) || e) }, { status: 500 });
    }
  },
};
