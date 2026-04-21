// GET /api/me — returns the signed-in student's email so the client can
// decide whether to show "sign in" or "welcome back" UI without having to
// decode the Access cookie itself.

type Ctx = EventContext<Record<string, unknown>, string, { email: string }>;

export const onRequestGet: PagesFunction<Record<string, unknown>, string, { email: string }> = async (
  context: Ctx,
) => {
  return new Response(JSON.stringify({ email: context.data.email }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
