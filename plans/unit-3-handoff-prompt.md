# Unit 3 Implementation Handoff — copy/paste into a fresh Claude Code session

The text below the `---` is the handoff prompt. Paste it as the first message in a fresh session. The plan files it references are committed at `de23e41` on branch `shallot-ge`.

---

I'm working on `shCode` at `C:\Users\shuff57\Documents\GitHub\shCode` (branch: `shallot-ge`). It's a Next.js 15 (output: 'export') high-school CS course site on Cloudflare Pages with D1.

A complete implementation plan for **Unit 3 (3D programming via shPlay)** has already been authored, critiqued, and revised across six passes. The plan files are committed and live at:

- `plans/unit-3-shplay.md` — 1691-line plan with 6 sections (Plan Overview, Phase 0 library expansion, Modules 3.1–3.13, Build Sequence, Open Questions, Files Inventory). **Read this first, in full.**
- `plans/lesson-numbering-convention.md` — q5play-style folder-naming convention + the canonical 13-module rename map. **Read this second.**

Existing infra worth grounding in (read these only when a task touches them):
- `public/shplay/shplay.js` (~236 lines) — current shPlay library; Phase 0 grows it to ~640 lines
- `public/shplay/runner.html`, `public/shplay/sandbox.html` — runner + standalone sketches
- `components/Q5PlayPreview.tsx` — pattern for the to-be-built `ShPlayPreview.tsx`
- `components/LessonWorkspace.tsx` — has ~8 `isQ5Mode` branches that need shplay companions
- `lib/q5play-docs.ts` — pattern for the to-be-built `lib/shplay-docs.ts`
- `functions/api/ai-help.ts` — needs lessonId-prefix routing + unit allowlist validator
- `lib/types.ts` line 82 — `preview` union needs `'shplay'` added
- `lessons/2-2-11-a12-1-collectible/` — canonical graded lesson example for q5play; mirror this shape for shplay
- `lessons/2-3-12-challenges/` — canonical challenges-with-OR-graded-regex example

## Your job

Drive the plan from end to end using **agent teams and subagents**. Don't do everything yourself in the main thread — delegate.

The plan is structured as 14 sequential waves (Wave 0 + Waves 1–13). Each wave has a definition-of-done in Section 4 of the plan. Work strictly wave-by-wave; later waves depend on earlier ones.

### Recommended agent strategy per wave

**Atlas as orchestrator.** Use the `atlas` agent for end-to-end orchestration of a single wave. Atlas reads the relevant section of the plan, decomposes into parallel-safe tasks, dispatches them to specialists, and verifies completion before moving to the next wave.

**Specialist agents to delegate to:**

| Task type | Agent |
|---|---|
| Library API implementation in `public/shplay/shplay.js` | `code-engineer` (or `prometheus` for autonomous end-to-end implementation of a well-defined Phase 0 sub-item) |
| Component wiring (`ShPlayPreview.tsx`, `LessonWorkspace.tsx` branch sweep) | `code-engineer` |
| Curriculum file authoring (lesson.json + script.js + solution.js per lesson folder) | `prometheus` per lesson, or `code-engineer` for batches |
| Lesson scaffold drafting (writing `// STEP N:` breadcrumbs + `solution.js` reference) | `code-engineer` |
| Sandbox example sketches in `public/shplay/sandbox.html` | `code-engineer` |
| Verification / "is this wave actually done" gates | `critic` or `feature-dev:code-reviewer` |
| Hard architecture or tradeoff questions during a wave | `oracle` (read-only advisory) |
| When stuck for 2+ hours on a bug | `debugger` |
| Open-ended search for "where does X happen in the codebase" | `Explore` (medium or very thorough) |
| UI/visual polish on the preview component or lesson workspace | `designer` |

**For Wave 0 specifically**, the work splits into ~7 parallel-safe sub-batches:

1. Library API additions to `shplay.js` (Cone/Cylinder/Torus + .size on Plane + random + radians/degrees + material props mixin + distance/intersects + Group + lights + camera precedence + deltaTime + AABB physics + parenting + dispose listener + section banners). One `code-engineer` agent can do this end-to-end, but if you want to parallelize, split into independent batches: shapes; physics; lights+materials; camera; group+collision; parenting; dispose+banners.
2. Three.js vendoring (download three.module.js into `public/shplay/vendor/three@0.180.0/`, update both importmaps, write `public/shplay/README.md`). Fast — `code-engineer`, single shot.
3. Sandbox sketches in `public/shplay/sandbox.html` (~11 new entries). `code-engineer` can do this after batch 1 lands.
4. `lib/types.ts` preview union + `lib/encode-code.ts` extraction + `components/Q5PlayPreview.tsx` import update. `code-engineer`, single shot.
5. `components/ShPlayPreview.tsx` new file with dispose contract. `code-engineer`.
6. `components/LessonWorkspace.tsx` branch sweep (~8 isQ5Mode locations). `code-engineer`. **Run a `critic` after** to verify every isQ5Mode reference now has either an isShPlayMode companion or a justifying comment.
7. `lib/shplay-docs.ts` skeleton (13 DocSection entries) + `functions/api/ai-help.ts` routing + lesson-state PUT handler backend gate for `3-13-*`. `code-engineer`.
8. Test lesson at `lessons/3-0-sandbox/` to verify the render pipeline end-to-end (manual smoke test in dev server).

After Wave 0 closes, `prometheus` can drive Wave 1 (the first lesson module) end-to-end given the plan's lesson table for Module 3.1 + the per-lesson scaffold STEPs.

### Lesson-folder bulk rename

**Before any lesson folder is created, apply the bulk rename described in `plans/lesson-numbering-convention.md` Section 7.** The plan's Section 3 lesson tables use pre-split numbering (`3-1-`, `3-2-`, ..., `3-6-`); the convention file's Section 7 maps those to final 13-module prefixes (`3-1-` through `3-13-`). The rename is mechanical but order-dependent (high-to-low to avoid prefix collisions). One `code-engineer` shot.

### Memory + context constraints to honor

- **Graded lesson `script.js` files MUST ship as `// STEP N:` breadcrumbs in empty `setup()`/`draw()` (or class methods)** — never as pre-working code. The `solution.js` is the reference answer; never sent to clients.
- **All `points` fields = 0.** Lessons unlock by completion (green-to-advance), not score.
- **Intro-course audience — be granular.** One new concept per lesson. Never compound. The plan's lesson tables already reflect this; preserve it during authoring.
- **Examples and sandboxes are runnable** (`preview: 'shplay'` + complete `script.js`, no STEPs, no requirements). Auto-mark complete on iframe heartbeat (Section 3 Legend describes the contract).
- **Examples reset by browser refresh** — every example/sandbox `description` ends with "Click your browser's Refresh to reset the code."
- **Build-up labs use cumulative starters** — each `B<N>`'s `script.js` contains the prior `B<N-1>`'s solution boilerplate already filled in, plus only this B's STEP comments.
- **Module 3.6 mid-unit writeup** (Collector Game) and **Module 3.13 unit-final writeup** are the only two AI-graded writeups in the unit (along with 3.1's first-3D writeup). Three writeups total per the keep-3-of-13 policy. Don't add more.

### How to start

Your first message should be a single agent dispatch:

```
Spawn atlas to orchestrate Wave 0 of plans/unit-3-shplay.md. The wave's
definition-of-done is in Section 4 (Wave 0 — Library and Infrastructure).
Decompose into 7 parallel-safe sub-batches as described in
plans/unit-3-handoff-prompt.md. Run a critic gate at the end of each
sub-batch before integrating. After all 7 land, run a final
feature-dev:code-reviewer on the integrated state to confirm Wave 0 is
actually done before unblocking Wave 1.
```

Don't try to do Wave 0 yourself in the main thread — atlas will be more reliable and your context stays clean for the wave handoffs.

### What "done" looks like (end state)

- Every lesson folder under `lessons/3-*` exists with the right files (lesson.json, script.js + solution.js for graded items, content.md for readings).
- `public/shplay/shplay.js` is ~640 lines with all Phase 0 APIs.
- `public/shplay/vendor/three@0.180.0/three.module.js` exists; runner.html and sandbox.html importmaps point to it; no unpkg.com network requests at runtime.
- `lib/types.ts` accepts `'shplay'` in the preview union.
- `lib/encode-code.ts` exists; `Q5PlayPreview.tsx` and `ShPlayPreview.tsx` both import from it.
- `LessonWorkspace.tsx` has `isShPlayMode` companions for every `isQ5Mode` branch.
- `lib/shplay-docs.ts` has 13 DocSection entries with content.
- `functions/api/ai-help.ts` routes by lessonId prefix and validates the unit string.
- `functions/api/lesson-state/[lessonId].ts` (or whichever PUT handler) rejects `3-13-*` writes when 3.11 Mood Scene isn't completed.
- The student-facing curriculum page lists Modules 3.1–3.13 in correct order; clicking a lesson runs in shPlay preview without errors.
- The teacher gradebook shows progress per Unit 3 lesson.

When all of that holds, ship.

### Things you should NOT do

- Don't re-architect the plan. It's been through six revision passes including a critic council. If you find an issue, file it as a TODO and proceed; only escalate to me (the user) if it's a hard blocker.
- Don't trim the granularity. The "one new concept per lesson" rule is load-bearing for the intro-course audience.
- Don't change the lesson schema (`lib/types.ts` Lesson interface). Adding `'shplay'` to the preview union is the only schema-shape change.
- Don't commit unless I ask you to. Build commits per wave but wait for explicit approval before pushing.
- Don't add features beyond what Phase 0 specifies. The library should grow from ~236 → ~640 lines, not 1000+.

### When you finish a wave

Report back with: the wave number, what shipped, any issues you logged as TODOs, and the next wave's first action. Then await my go-ahead before starting the next wave (unless I've already said "run all waves").

Begin by reading both plan files in full, then dispatch atlas for Wave 0.
