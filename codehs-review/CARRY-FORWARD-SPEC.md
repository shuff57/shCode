# Carry the student's own work forward, lab to lab

Build spec, drafted 2026-11-04 on `codehs-inspiration`. Nothing is built by this file.

**The problem.** Every moSHion lab re-seeds from its authored starter, and for most labs
that starter is an **earlier lab's reference solution**. So the *game* carries forward and
the *student's game* does not: a student who solved 5.3.14 their own way opens 5.3.17 and
is handed the reference back. Across a 21-screen Pinball build that is the difference
between "my game is growing" and "I rebuild the game every other day", and it is exactly
the multi-day, multi-group shape the games are moving to.

**Measured today** (code-identical after EOL normalisation, comment-only lines and blank
lines removed):

| Lesson's starter is | Source | Match |
| --- | --- | --- |
| 5.3.12 | 5.3.10's solution | identical |
| 5.3.17 | 5.3.14's solution | identical |
| 5.3.19 | 5.3.17's solution | identical |
| 5.3.21 | 5.3.19's solution | identical |
| 5.4.8 | 5.4.7's solution | identical |
| 5.5.11 | 5.5.8's solution | identical |
| 5.3.7, 5.3.10, 5.3.14 | 5.3.4, 5.3.4, 5.3.8 | 0.93-0.97 |
| 5.3.8, 5.4.6, 5.5.6 | 5.3.4, 5.4.4, 5.5.4 | 0.38-0.43, rewritten tables |

So the chain already exists on disk; it is simply never expressed, and no code path
connects lesson N's saved work to lesson N+1.

---

## 1. Decisions taken

1. **Per-lab carry, not one project file.** A student brings their previous lab's code
   into the next lab. A single long-lived project document across a whole module is
   cheaper to use and much more expensive to build (it rewrites drafts, commits, the
   starter concept and every gate); it stays out of scope until there is evidence that
   per-lab carry is not enough.
2. **Offer, never silent.** A silent carry breaks "run the starter first", breaks Reset's
   contract, and would drop a student into code they did not choose.
3. **The chain is explicit and gated.** `carryFrom` in `lesson.json`, derived by script,
   checked by a gate. It is never inferred at runtime.
4. **Carrying writes a commit.** "Brought forward from 5.3.14" becomes the new lesson's
   first commit, so History has a restore point and the teacher can see provenance.
5. **Reset is unchanged.** Reset still returns the authored starter, never the carried copy.
6. **Only the graded code file travels.** `script.js` for every lab in the games block.
   The new lesson's `// STEP n` comments do not exist in carried work, and that is fine
   (section 5).

## 2. Data: `carryFrom`

`lessons/<id>/lesson.json` gains one optional string:

```json
"carryFrom": "5-3-pinball-sound-2-lab-a-chime-on-every-hit"
```

It is the **folder id** of the source lesson (`progress` and drafts key on the folder id,
so the target must be that id, never the display number).

**`scripts/derive-carry-chain.mjs`** proposes the links. For every lab (`type: lesson`,
`script.js` present) it compares the starter against every earlier `solution.js` in the
**same module**, after removing comment-only and blank lines:

- exact match, or >= 0.93 similarity -> propose, with the ratio printed;
- 0.30-0.93 -> print for a human, do not write;
- below 0.30 -> no link.

It writes nothing unless `--write` is passed, and it never proposes a link across modules
(5.3 -> 5.4 is a fresh game and must stay a fresh start).

**`scripts/check-carry-chain.mjs`** (prebuild and `npm test`) fails when:

- `carryFrom` names a lesson that does not exist;
- the source is not earlier in course order (`lib/lesson-order.ts`);
- the source is in a different module;
- the source has no `solution.js` (nothing to carry from).

It warns, but does not fail, when a declared link's starter no longer resembles the
source's solution: that is a real edit upstream, and a human should confirm the link still
means what it says.

## 3. What the student sees

On opening a lab that has `carryFrom`, and only when the student has work in the source
lesson (a commit, or an offline draft), a strip above the editor:

> **Your 5.3.14 table is saved.** Start this lab from your own code, or from the starter.
> [Bring my work forward] [Start from the starter]

Rules:

- **No strip when the target lesson already has work** (commit or draft): their newer work
  always wins and must never be overwritten.
- **Dismissal is remembered** per `(target lesson, source lesson)` in localStorage, so the
  strip does not reappear after "start from the starter".
- **Offline fallback:** if `GET /api/commits?lessonId=<source>` fails, use the local draft
  for the source lesson. If neither exists, no strip.
- **Bring it forward** copies the source's newest commit's files over the target's
  `fileContents` (same paths only), normalises EOL, then POSTs a commit in the target
  lesson with message `Brought forward from <source title>`. The Run button then runs
  their own game.

No new API route and no migration: `GET /api/commits` is already scoped to the caller
(`student_email = ?`), and uncommitted drafts already live in localStorage. One new pure
module (`lib/carry-forward.ts`) and one store action (`hydrateFromLesson`) cover it.

## 4. Grading

Unchanged, by construction: the regex cards and the AI rubric read whatever is in the
editor. The AI prompt's existing rule ("the starter's STEP comments are never the
student's work") still holds. A carried file may already satisfy a card the step has not
reached; that is a student who ran ahead, not a hole.

The gates are also unchanged: `check-starters` grades the *authored* starter, so carrying
cannot move a baseline.

## 5. The authoring rule this forces (add as `DEEPEN-GAMES` §0 rule 8)

**A step names the shape, never the comment.** "In `setup()`, where the STEP 1 comment is"
is false for every student who carried their work forward; "in `setup()`, below each
bumper's `worth` line" is true for both. Where a name could reasonably differ, one
sentence is allowed: "If you brought your 5.3.14 work forward, your bumpers may be called
something else."

Six shipped labs currently point at STEP comments and need the wording fix, text only,
no grader change: `5-2-update-2-lab-rules-in-update`,
`5-3-pinball-sound-2-lab-a-chime-on-every-hit`,
`5-3-pinball-polish-3-lab-show-the-worth-pop-the-points`,
`5-3-pinball-polish-5-lab-nudge-the-table`,
`6-11-sound-3-lab-a-sound-on-an-event`, `6-11-sound-5-lab-a-sound-that-varies`.
`3-4-*`/`1-4-*` mentions of "STEP" are about console.log answers, not placement, and are
out of scope.

## 6. Order of work (before batch 2)

1. **Derive and declare the chain** for the shipped games labs (5.3, 5.4, 5.5, 5.9-5.11),
   plus the gate. A human confirms every 0.30-0.93 proposal.
2. **The strip and the store action**, with `scripts/test-carry-forward.mjs` covering:
   merge takes only code paths, EOL is normalised, newer work is never overwritten,
   dismissal is keyed per pair, the provenance message is exact.
3. **Wording fix** for the six labs above.
4. **One browser walk**, student A: solve 5.3.14, open 5.3.17, bring forward, Run clean,
   History shows the carried commit, Reset returns the authored starter.
5. **Then batch 2**, authored under the rule from the first lesson.

Estimated: one day end to end (derivation ~2 h, store + strip ~4 h, tests ~2 h, wording
~1 h). Nothing here touches the release branch.

## 7. Open for the owner

1. **Teacher visibility.** Provenance is in the commit message. Is that enough, or does the
   gradebook need a "carried" badge per submission? *Recommended: message only; add a badge
   only if a teacher asks for it.*
2. **Readings and examples** carry no `carryFrom` (only graded labs). *Recommended: keep it
   that way; a reading has nothing to grade.*
3. **`/sandbox` import.** "Open my latest lab in the sandbox" is a natural next want and is
   out of scope here. *Recommended: defer.*

## 8. Not in scope

One project file per game (decision 1), copying between students (the API is already
scoped to the caller and must stay that way), and importing a downloaded `.js` file.
