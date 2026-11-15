// GET /api/audiences
//
// What the "who can see it" picker offers the caller (migration 0057, functions/_shared/audience.ts):
//   classes   the classes they can share into, each with its teacher's person key and name;
//   teachers  a student only: one entry per teacher whose class they are in, with how many live classes that
//             teacher has ("all of Ms. Huff's 4 classes"). Other classes' names are never sent.
// No email in the answer.

import { audienceOptions } from '../_shared/audience';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }) => {
  const options = await audienceOptions(env.DB, data);
  return new Response(JSON.stringify(options), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
