# Spec: anchor module 2.4's auto-graders so they check structure, not presence

## Background

`cs-student-advanced` (gaming lens) live-tested all 8 regex-graded labs in module
2.4 against `http://localhost:3002/api/grade` (same `regex`/`inFunction` switch as
prod, in `server.js` and `functions/api/*` — `lib/grader.ts` client-side mirrors it).
Confirmed: **one static 16-line junk script, never touched per-lesson, scores
`passed:true` on all 8 lessons simultaneously.** Example:

```js
while (true) { break; }
console.log(1);
```

scores 100% on `2-4-12-lab-break-square`, whose actual assignment is "count `n`
up from 1, break when `n*n > 50`, log `n` and its square." The requirements never
check that `break` is *inside* the `while(true)`, that `n*n` is compared to 50
anywhere, or that anything computed relates to what's logged — they're three
independent "does this substring exist anywhere in the file" checks.

This is a real course-integrity gap (gameable without doing the exercise), not a
false-strict complaint like the 2.1 batch fixed in commit `760e037c`. **Do not
loosen anything further — the direction of this fix is tightening.**

## Affected lessons

`2-4-4-lab-write-both-loops`, `2-4-8-lab-do-while-count`,
`2-4-12-lab-break-square`, `2-4-19-lab-multiples-of-three`,
`2-4-23-...` (do-while fix lab), `2-4-30-lab-triangle-of-stars`,
`2-4-31-...`, `2-4-32-a2-4-2-grid-pattern`.

Read each `lessons/2-4-*/lesson.json` yourself (title/steps/requirements),
plus its `solution.js` or `solution/` (reference answer — see
`lib/lessons.ts` / project `CLAUDE.md` "Reference solutions" for the two
forms) and its shipped `script.js` starter, before touching the regex.

I've already read three in full:

- **2-4-12-lab-break-square**: needs `n` starting at 1, a `while(true)` loop,
  `n*n > 50` (or equivalent) checked *inside that loop*, `break` *inside that
  loop*, and `console.log` that runs (order doesn't have to be exactly this,
  but everything must be textually inside the same `while(true){...}` block,
  not scattered independent statements).
- **2-4-30-lab-triangle-of-stars**: outer `for` from 1, inner `for` whose
  upper bound is the OUTER counter (not a fixed number) — currently hardcodes
  `row`/`star` as literal names. `cs-mod-24` found this rejects a student who
  reused module 2.1-2.3's `i`/`j` naming with otherwise-correct logic.
  **Fix this the same way I fixed `2-2-17b`** (commit `760e037c`): capture the
  outer counter name with a regex group and backreference it in the inner
  bound check, instead of hardcoding `row`. Do NOT just widen name acceptance
  without also re-anchoring the "inner bound depends on outer" relationship —
  that's the actual thing being tested and it's currently checked by a bare
  `star\s*<=\s*row` substring match with no scoping to the inner loop at all.
- **2-4-32-a2-4-2-grid-pattern**: same class of issue as 2-4-30, both the
  gameability (independent presence checks) and the naming rigidity
  (`row`/`col` hardcoded, `cs-mod-24` confirmed a `2.1-2.3`-style rename
  breaks it). Fix both together.

The other 5 lessons I have not read — read them and apply the same principle.

## What "anchored" means here

This grader is regex-only (no AST, no code execution — see `server.js`'s
`/api/grade` and `lib/grader.ts`). The fix is NOT to add execution; it's to
make the regex require **textual co-occurrence within the right scope**
instead of independent existence anywhere in the file. Patterns already in
this codebase do this correctly — copy their shape:

- `functions/api/lesson-solution` grading and several existing lessons use
  `[^}]*` / `[^}]*?` to bound a match to "inside the same brace pair" (see
  `2-1-17-lab-nested-conditionals`'s nested-if check, or the `inFunction`
  requirement type in `server.js` / `lib/grader.ts` which extracts a named
  function's body before testing against it).
- Where a lesson doesn't use a function, bound with the loop's own braces:
  `while\s*\(\s*true\s*\)\s*\{[^}]*break\b[^}]*\}` requires `break` textually
  between the loop's `{` and its matching `}` — good enough for these single
  -level loops (no need to handle arbitrarily nested braces, these are
  beginner labs with shallow nesting; check each lesson's actual reference
  solution to confirm nesting depth before assuming a naive `[^}]*` bound is
  safe — if a lesson's real solution has a brace nested *inside* the loop
  body between the two checks, `[^}]*` will stop too early and you'll need
  `[^{}]*(?:\{[^{}]*\}[^{}]*)*` (one level of nested braces tolerated) instead).
- For "inner bound depends on outer counter" (2-4-30/32), capture the outer
  counter's identifier and backreference it, same technique as
  `2-2-17b-lab-count-a-letter`'s r1 fix (commit `760e037c`):
  `for\s*\(\s*(?:let|var)\s+([A-Za-z_$]\w*)\s*=\s*1[\s\S]*?\1` style — read
  that commit's diff for the exact pattern shape (`git show 760e037c --
  lessons/2-2-17b-lab-count-a-letter/lesson.json`).

## Acceptance criteria (must verify yourself before reporting done)

1. `node scripts/check-starters.mjs` — must still report every reference
   solution scores full and every shipped starter does not, across all
   graded lessons (currently 164).
2. Every reference solution for the 8 touched lessons, live-POSTed to
   `http://localhost:3002/api/grade` (dev server should already be running
   on :3002 — check with `curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/`
   first; if it's down, message `team-lead`, don't restart it yourself, other
   agents share it), scores full marks.
3. The exact 16-line junk template from `cs-adv-24`'s report (reproduced
   below) is live-POSTed against ALL 8 lessons and must now score `passed:
   false` / fewer than full requirements on every one of them:
   ```js
   while (true) { break; }
   do { } while (false);
   for (let i = 1; i <= 5; i++) { }
   for (let row = 1; row <= 5; row++) { }
   let rows = 5;
   let cols = 5;
   row < rows;
   col < cols;
   star <= row;
   let b = a + 1;
   n++;
   count--;
   let k = 1;
   continue;
   i % 3;
   console.log(1);
   ```
4. For `2-4-30` and `2-4-32` specifically: live-test a correct answer that
   uses `i`/`j` naming (module 2.1-2.3 style) instead of `row`/`star` or
   `row`/`col`/`col` — must now pass, matching the same accept-any-consistent
   -name fix already shipped for `2-2-17b`.
5. Do not touch any lesson outside this list of 8. Do not touch anything in
   module 2.1 or 2.2 (already fixed and committed this session).

## What to do when done

**Do not commit.** Report back to `team-lead` (SendMessage, reply to whoever
dispatched you) with: a summary of what changed per lesson, the live-test
evidence for all 5 acceptance criteria above, and anything you could not
verify or any lesson where you had to make a judgment call. The main session
will review the diff and commit.
