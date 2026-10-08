# Spec: finish the remaining 3.2 / 3.3 items

State file for a self-paced loop. Each pass: read this file, do the FIRST unchecked pass, tick it, commit, stop the pass.
Branch `cs-3d`. Work in a clean worktree (`git worktree add --detach ../shCode-loopN HEAD`, symlink `node_modules`,
copy `public/reshape/kernel` and `pa-pseudocode/*.md`), merge back by fast-forward, remove the worktree.

## Hard rules
- Never deploy, apply a migration, run the chart data pull, or touch production data without the owner's explicit yes in the conversation. When a pass reaches one of those, STOP the loop and ask.
- Never rename a lesson folder or id; titles carry the order (`scripts/renumber-module.mjs`).
- Never `git stash`, `pkill -f`, or move the tries stamp. Kill dev servers by pid only.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Each pass ends green: `npx tsc --noEmit`, the item's own checks, and (passes 1-3) a full `npm test`, then `git push origin cs-3d`.
- Leave `.gauntlet/occt-checks.json`, `functions/_shared/module-docs.generated.ts` (unless the module-doc generator changed it on purpose) and `replica/` alone.

## Passes
- [x] **P1 Docs cleanup.** Fix the stale "shift/unshift not covered" row in the 3.3 density table; make the 3.2 and 3.3 module docs (`curriculum/modules/3.2_*.md`, `3.3_*.md`) describe the starter-based array labs and the counted charts A3.2.2 / A3.2.3 (Lab, pass at 80%, done = 100%); make the 3.2 Day 3 note match the real lesson count. Checks: check-lesson-citations, check-slot-map, check-hints, generate-module-docs.
- [x] **P2 Trim the repeated 3.2.3 lesson.** Cut the duplicated explanation, keep the one example later lessons point to. No id changes, titles stay sequential. Checks: check-lesson-citations, check-help-pointer-titles --only 3.2,3.3, check-lesson-numbers, check-slot-map.
- [x] **P3 Figures with alt text.** Add figures (the ```flow fence, see `.claude/skills/flowchart-diagrams/SKILL.md`) where a diagram replaces a paragraph in the 3.2 and 3.3 readings; every figure has alt text; check phone width (390px) in a browser on the dev server. Checks: check-flow-figures, check-reachable.
- [x] **P4 Due-dates panel overflow.** `components/DueDatesPanel.tsx` rows overflow ~23px at 390px; fix; verify at 390px in a browser.
- [x] **P5 (BUILT, awaiting owner for migration + deploy) Most-missed-requirement view (STOP BEFORE THE MIGRATION).** Build everything locally and test it, then stop and ask the owner:
  - migration `0035`: `requirement_events(student_email, lesson_id, req_id, fails, first_pass_at, updated_at)`, `IF NOT EXISTS`, primary key (student_email, lesson_id, req_id);
  - `POST /api/requirement-events` (student, batched counts per Run, bounded sizes) and a teacher read scoped to the teacher's own class;
  - client batching on Run in the console lab view; a "Most missed" tab or panel on the teacher page;
  - tests driving the real handler against SQLite (`scripts/_d1-sqlite.mjs`), wired into `npm test`;
  - docs in CLAUDE.md (API surface) and HANDOFF.md.
  Owner then says yes to: apply migration (`npm run d1:migrate`), deploy from a clean worktree (`TRIES_STAMP_ALLOW_OLD=1 npm run deploy`), signed-in live check with a throwaway student and teacher (see the throwaway-accounts memory), zero-row cleanup.

## Outside the loop (owner)
- Set class due dates for the counted labs (teacher view).
- 3.3.11: flipped to Lab (A3.3.2) on 2026-10-08 on the owner's instruction, before any student had drawn it. Optional: re-run the chart data pull (owner approval) once ~20 students have, as a sanity check, not a gate.

## Log
(one line per finished pass: date, commit)
- 2026-10-08 P1 docs cleanup: 3.2/3.3 module docs describe the counted charts, starter-based array labs; stale audit rows fixed.
- 2026-10-08 P2 trim 3.2.3: dropped the duplicated static example and the two-parameter block that 3.2.2 already teaches; live-block snapshot updated.
- 2026-10-08 P3 figures: flowchart with full-description caption added to 3.2.14 (early return) and 3.3.17 (build a new list); checked at 390px. Skipped 3.3.5 and 3.2.21 on purpose (they would give away the charts students draw).
- 2026-10-08 P4 due-dates panel: DateTimeField wraps and caps at the row width; with every module expanded the page no longer scrolls sideways at 390px (was 23px over). Seen and left: the lesson-mode chooser (lmc-choices) on the Schedule tab is 14px over at 360px.
- 2026-10-08 P5 built and tested locally on cs-3d (8f408189..dee5fc3b): 44+20 new checks, full npm test exit 0, browser-checked at 390px. NOT applied: migration 0035, deploy, live check. Owner decides.
