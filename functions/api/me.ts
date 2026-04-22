// GET /api/me — returns the signed-in student's email + role so the client
// can show admin UI without having to decode the session cookie itself.

type Session = { email: string; role: 'admin' | 'student' };
type Ctx = EventContext<Record<string, unknown>, string, Session>;

export const onRequestGet: PagesFunction<Record<string, unknown>, string, Session> = async (
  context: Ctx,
) => {
  return new Response(
    JSON.stringify({ email: context.data.email, role: context.data.role }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
