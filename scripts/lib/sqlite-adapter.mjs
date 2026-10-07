// An in-memory SQLite for the tests that stand in for D1, on whichever runtime has one:
// bun:sqlite (Bun) or node:sqlite (Node >= 22.5). Both are exposed as the same tiny
// surface the D1 test doubles use: run(sql, params?), query(sql) -> { all, get, run }.
//
// WHY THIS EXISTS. test-attempt-reveal.mjs used to import bun:sqlite and, when that
// failed, print SKIP and exit 0. On real Node (a self-hosting teacher, CI) that is a
// green `npm test` in which the cap, reveal, release and score suites never ran. A
// missing engine is now a FAILURE, unless ALLOW_SKIP_SQLITE=1 says the skip is
// intended. The engine that ran is returned so the test can print it.

let engine = null;
let Ctor = null;
// FORCE_NO_SQLITE=1 pretends neither engine exists (the self-test of the loud failure below).
const forceNone = process.env.FORCE_NO_SQLITE === '1';
// SQLITE_ENGINE=node:sqlite prefers node:sqlite even where bun:sqlite exists (so the Node
// path can be exercised under Bun).
const preferNode = process.env.SQLITE_ENGINE === 'node:sqlite';
try {
  if (forceNone || preferNode) throw new Error('skipped');
  ({ Database: Ctor } = await import('bun:sqlite'));
  engine = 'bun:sqlite';
} catch {
  try {
    if (forceNone) throw new Error('forced');
    ({ DatabaseSync: Ctor } = await import('node:sqlite'));
    engine = 'node:sqlite';
  } catch { /* neither */ }
}

export const sqliteEngine = engine;

/** Call first. Returns the engine name, or exits (1, or 0 with ALLOW_SKIP_SQLITE=1). */
export function requireSqlite(testName) {
  if (engine) return engine;
  if (process.env.ALLOW_SKIP_SQLITE === '1') {
    console.log(`SKIP ${testName}: no SQLite engine (bun:sqlite or node:sqlite) and ALLOW_SKIP_SQLITE=1`);
    process.exit(0);
  }
  console.error(
    `FAIL: ${testName} needs an in-memory SQLite (bun:sqlite, or node:sqlite on Node >= 22.5) and this runtime has neither.\n` +
    '  A silent skip here is a green suite that ran nothing; set ALLOW_SKIP_SQLITE=1 only if that is intended.',
  );
  process.exit(1);
}

export function openMemoryDb() {
  if (!engine) throw new Error('no SQLite engine: call requireSqlite() first');
  const raw = new Ctor(':memory:');
  if (engine === 'bun:sqlite') return raw; // already run(sql, params) / query(sql)
  // node:sqlite: exec / prepare, and a different result shape for run().
  return {
    run(text, params) {
      if (params === undefined || (Array.isArray(params) && params.length === 0)) {
        raw.exec(text);
        return { changes: 0 };
      }
      return raw.prepare(text).run(...(Array.isArray(params) ? params : [params]));
    },
    query(text) {
      const stmt = raw.prepare(text);
      return {
        all: (...a) => stmt.all(...a),
        get: (...a) => stmt.get(...a),
        run: (...a) => stmt.run(...a),
      };
    },
  };
}
