// jscad-checks.mjs — what the JSCAD gate knows, as data.
//
// Split out from test-jscad.mjs for the same reason shplay-checks.mjs is split
// out of test-shplay.mjs: the mechanics and the expectations are edited by
// different people for different reasons. A number in here changes because the
// library or the curriculum changed. A line in test-jscad.mjs changes because
// the gate itself was wrong.
//
// Runtime builders MUST NOT edit this file to make a red check go green.
// A red check is closed by fixing public/jscad/runner.html, the vendored
// bundles, or the docs — never by loosening an expectation here.

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

/** @jscad/modeling@2.13.0 — declaration order of src/index.js. */
export const EXPECTED_MODULE_ORDER = [
  'colors', 'curves', 'geometries', 'maths', 'measurements', 'primitives',
  'text', 'utils', 'booleans', 'expansions', 'extrusions', 'hulls',
  'minkowski', 'modifiers', 'transforms',
];

/**
 * The only two names inside @jscad/modeling that a top-level module and a
 * module member both claim. The shim banner in runner.html states this list;
 * this is the line that makes the statement testable.
 *
 * If a library upgrade adds a third, the fix is NOT to extend this array: it
 * is to decide, in the shim banner, which side wins, and only then record it.
 */
export const DOCUMENTED_COLLISIONS = [
  { name: 'utils', winner: '<module>', loser: 'maths' },
  { name: 'minkowski', winner: '<module>', loser: 'booleans' },
];

/** How many bare names the shim installs. A jump means the surface moved. */
export const EXPECTED_BARE_NAME_COUNT = 124;

// ---------------------------------------------------------------------------
// The taught API
// ---------------------------------------------------------------------------

/**
 * The functions the course actually puts in front of a student. Every one is
 * asserted to be the SAME REFERENCE bare as it is namespaced — that is the
 * check that stops a future shim from "helpfully" wrapping geometry in a
 * friendlier object and quietly breaking paste-into-jscad.app.
 *
 * This list is the floor. jscad-harness/test-jscad additionally derives the
 * full taught set from the tables in public/jscad/docs/reference.md, so a name
 * added to the docs is covered without anyone remembering to add it here; the
 * floor exists so deleting a docs table cannot silently shrink the gate.
 */
export const CORE_TAUGHT = [
  { module: 'primitives', name: 'cube' },
  { module: 'primitives', name: 'sphere' },
  { module: 'primitives', name: 'cylinder' },
  { module: 'transforms', name: 'translate' },
  { module: 'transforms', name: 'rotate' },
  { module: 'transforms', name: 'scale' },
  { module: 'booleans', name: 'union' },
  { module: 'booleans', name: 'subtract' },
  { module: 'booleans', name: 'intersect' },
  { module: 'extrusions', name: 'extrudeLinear' },
  { module: 'extrusions', name: 'extrudeRotate' },
  { module: 'hulls', name: 'hull' },
  { module: 'measurements', name: 'measureBoundingBox' },
  { module: 'colors', name: 'colorize' },
];

/**
 * Pull the taught API straight out of the reference's module sections:
 *   - first-column backticked names in each `### <module> — …` table
 *     (`rotateX` / `rotateY` / `rotateZ` in one cell counts as three)
 *   - any `<module>.<name>` written in that section's prose or examples,
 *     which is how the module-less sections (colors) declare theirs
 */
export function taughtFromReference(md) {
  const out = [];
  const seen = new Set();
  // Split on headings rather than a lookahead. `\Z` is not JavaScript — as a
  // lookahead alternative it matches a literal Z, which truncated the
  // transforms section at `rotateZ` and the extrusions section at "straight
  // up Z", quietly dropping `scale` and `extrudeRotate` from the taught set.
  const sections = [];
  const lines = md.split('\n');
  let cur = null;
  for (const line of lines) {
    const h3 = /^### (\w+)/.exec(line);
    if (h3) { cur = { module: h3[1], body: [] }; sections.push(cur); continue; }
    if (/^## /.test(line)) { cur = null; continue; }
    if (cur) cur.body.push(line);
  }
  for (const { module: mod, body: bodyLines } of sections) {
    const body = bodyLines.join('\n');
    const add = (name) => {
      const key = `${mod}.${name}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ module: mod, name });
    };
    for (const row of body.matchAll(/^\|\s*`([^`|]+)`(?:\s*\/\s*`([^`|]+)`)*\s*\|/gm)) {
      for (const cell of row[0].matchAll(/`([A-Za-z_$][\w$]*)`/g)) add(cell[1]);
    }
    for (const use of body.matchAll(new RegExp(`\\b${mod}\\.([A-Za-z_$][\\w$]*)`, 'g'))) add(use[1]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The renderer
// ---------------------------------------------------------------------------

/**
 * runner.html reads the renderer through six local aliases. Mapping each alias
 * back to its real path lets the gate derive the symbol list from the runner
 * source instead of duplicating it — add a call to the runner and the gate
 * starts asserting it on the next run.
 */
export const REGL_ALIASES = {
  regl: '',
  drawCommands: 'drawCommands',
  cameras: 'cameras',
  controls: 'controls',
  perspectiveCamera: 'cameras.perspective',
  orbitControls: 'controls.orbit',
};

/** Below this, the derivation has stopped seeing the renderer wiring. */
export const MIN_REGL_SYMBOLS = 14;

/** Keys entitiesFromSolids must put on a drawable entity's geometry. */
export const ENTITY_GEOMETRY_KEYS = ['type', 'positions', 'normals', 'indices', 'colors', 'transforms'];

// ---------------------------------------------------------------------------
// The docs
// ---------------------------------------------------------------------------

/**
 * public/jscad/docs/CLAUDE.md: "The in-app docs and docs/reference.md must
 * stay in sync." Empty means the rule holds with no exceptions today. An entry
 * is a deliberate, reviewed asymmetry — name it and say why, or fix the docs.
 */
export const DOC_SYNC_EXCEPTIONS = [
  // { name: 'someFn', only: 'reference', why: '…' },
];

/** A doc example is a doc example; below this the extractor has broken. */
export const MIN_DOC_EXAMPLES = 35;

/**
 * Fence tags reference.md may carry, and what each one promises. Both are
 * asserted in the direction that makes the tag un-abusable: a `skeleton` that
 * returns geometry, or a `shcode-only` that runs portably, is a failure — the
 * tag would be hiding a working example rather than describing a real one.
 */
export const FENCE_TAGS = {
  skeleton: 'main() is a stub; it must run portably and return nothing',
  'shcode-only': 'depends on the runner shim; it must NOT run portably',
};

// ---------------------------------------------------------------------------
// Reachability
// ---------------------------------------------------------------------------

/**
 * The wire from "a student clicks JSCAD in the header" to "public/jscad/runner.html
 * loads". Every other group in this gate asserts that the runtime is CORRECT.
 * None of them asserted that anything LOADS it, and for the whole of the first
 * build nothing did: DocsSandbox declared `preview = 'shplay'` as a default and
 * DocsClient never passed a value, so /docs/jscad piped JSCAD source into the
 * shPlay runner and all 24 examples died on `require is not defined`. 67 green
 * checks, zero reachable users.
 *
 * The walk resolves each hop by reading the PREVIOUS hop's import of it, so
 * moving or renaming a file breaks the chain honestly instead of leaving a
 * hard-coded path pointing at nothing.
 *
 *   file        where the walk currently stands
 *   role        the sentence this hop is responsible for being true
 *   requires    [{ what, pattern }] — asserted against that file's source
 *   forbids     [{ what, pattern }] — asserted absent; these are the regressions
 *   next        local import name to resolve into the following hop's file
 *   asset       a non-source file this hop must actually reach on disk
 */
export const REACH_CHAIN = [
  {
    file: 'components/HeaderNav.tsx',
    role: 'a student can reach the JSCAD docs from the site nav',
    requires: [{ what: 'a nav link to /docs/jscad', pattern: /href="\/docs\/jscad"/ }],
    // Not an import — the hop from a nav href to a page is Next.js filesystem
    // routing, so the next file is DERIVED from the href this link carries.
    nextRoute: { hrefPattern: /href="(\/docs\/jscad)"/, page: '[section]/page.tsx' },
  },
  {
    file: 'app/docs/jscad/[section]/page.tsx',
    role: 'the JSCAD docs route tells the client which runtime its code is for',
    requires: [{ what: 'preview="jscad" handed to DocsClient', pattern: /preview="jscad"/ }],
    next: 'DocsClient',
  },
  {
    file: 'app/docs/shplay/[section]/DocsClient.tsx',
    role: 'the shared docs client forwards the runtime instead of dropping it',
    requires: [
      { what: 'preview is a REQUIRED prop', pattern: /^\s*preview: 'shplay' \| 'jscad';/m },
      { what: 'preview is destructured from props', pattern: /^\s*preview,$/m },
      { what: 'preview is forwarded to DocsSandbox', pattern: /preview=\{preview\}/ },
    ],
    forbids: [{ what: 'an optional preview prop', pattern: /preview\?:/ }],
    next: 'DocsSandbox',
  },
  {
    file: 'app/docs/shplay/[section]/DocsSandbox.tsx',
    role: 'the sandbox picks the runner from the runtime it was told, with no default',
    requires: [
      { what: 'preview is a REQUIRED prop', pattern: /^\s*preview: 'shplay' \| 'jscad';/m },
      { what: "a preview === 'jscad' branch rendering JscadPreview", pattern: /preview === 'jscad'[\s\S]{0,120}<JscadPreview/ },
    ],
    forbids: [
      // The exact regression. A default here silently swallows a missing prop
      // and sends JSCAD source to a runtime that cannot execute it.
      { what: "a defaulted preview ('shplay' wins by silence)", pattern: /preview\s*=\s*'/ },
      { what: 'an optional preview prop', pattern: /preview\?:/ },
    ],
    next: 'JscadPreview',
  },
  {
    file: 'components/JscadPreview.tsx',
    role: 'the preview component points an iframe at the vendored JSCAD runner',
    requires: [
      { what: 'src built from /jscad/runner.html', pattern: /\/jscad\/runner\.html\?code=/ },
      { what: 'the shared base64 encoder', pattern: /encodeCode\(code\)/ },
    ],
    asset: 'public/jscad/runner.html',
  },
];

/**
 * The other live consumer. No shipping lesson sets `preview: "jscad"` today
 * (all three JSCAD lessons sit in lessons/_retired/), so this hop is not on the
 * student path right now — but it is the wire an un-retired lesson would travel,
 * and it cost nothing to keep honest.
 */
export const REACH_LESSON = {
  file: 'components/LessonWorkspace.tsx',
  requires: [
    { what: "isJscadMode derived from lesson.preview", pattern: /isJscadMode\s*=\s*lesson\.preview === 'jscad'/ },
    { what: 'a render branch mounting JscadPreview', pattern: /isJscadMode \?[\s\S]{0,80}<JscadPreview/ },
    { what: 'JscadPreview receives code and runKey', pattern: /<JscadPreview code=\{jscadCode\} runKey=\{runKey\} \/>/ },
  ],
};

/** shPlay must keep its own runtime — the fix must not cross the two wires. */
export const REACH_SHPLAY = {
  file: 'app/docs/shplay/[section]/page.tsx',
  requires: [{ what: 'preview="shplay" handed to DocsClient', pattern: /preview="shplay"/ }],
};
