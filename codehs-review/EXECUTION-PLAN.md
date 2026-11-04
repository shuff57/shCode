# Execution plan: restructure units 5-7 and build what is missing

Drafted 2026-11-04. This is the plan to *do* what `LAYOUT-2026-11.md` describes. Nothing here is
started yet.

**What exists:** 341 lessons numbered into units 5-7, all gated; 5.1-5.5, 6.1-6.11 and 7.1-7.6
authored. **What the layout needs:** 65-66 modules instead of 20, 73 new lessons, 65 module docs,
65 group files, and the machinery that makes a chain of day-modules work.

---

## Phase 0 — Decisions (half a day, no code)

| # | Decision | Recommendation |
| --- | --- | --- |
| 1 | Unit 6 has no capstone in the layout | **Add 6.28 Build your own**, so every unit closes the same way (5.17, 6.28, 7.21) |
| 2 | Grids (6.14) is the one concept whose game is in unit 7 | **Keep it in 6**, cite it from 7.15; its module text says so |
| 3 | Two light Pinball days (5.5 at 26 min, 5.6 at 30) | **Leave them**; early Pinball is where a beginner is slowest |
| 4 | Optional modules at deploy | Author and gate them, **but write no due/open rows** until assigned |
| 5 | Release cadence | **One release per unit** (5, then 6, then 7), not one 93-hour release |

## Phase 1 — Machinery (2 days)

1. **Carry-forward.** Derive `carryFrom` from each lab's starter against earlier `solution.js`;
   `check-carry-chain` gate; `lib/carry-forward.ts`; `hydrateFromLesson` in the store; the offer
   strip; provenance commit; `test-carry-forward.mjs`; one browser walk. *Blocks every module
   boundary in the layout.*
2. **Split tool.** `scripts/split-module.mjs`: a plan file maps folder ids to new module numbers;
   it renumbers titles, writes a one-page module doc per new module, writes the group file, and
   prints the D1 rows. Dry-run first, diff reviewable. *Blocks phase 2.*
3. **Gate adjustments.** `check-lesson-numbers`, `check-lesson-groups`, `check-lesson-citations`,
   `check-slot-map` must understand 20 modules becoming 65.

## Phase 2 — Migrate the existing content (2-3 days)

No new lessons. Every folder keeps its id, so progress, drafts, submissions and lesson rows are
untouched.

| From | To | Lessons |
| --- | --- | --- |
| 5.3 Pinball | 5.3-5.9 | 21 |
| 5.4 Flappy | 5.10-5.12 | 11 |
| 5.5 Snake | 5.13-5.16 | 11 |
| 6.10 Breakout | 7.13-7.17 | 13 |
| 7.4-7.6 Defender | 7.4-7.12 | 27 |
| 5.1, 5.2, 6.1-6.9, 6.11, 7.1-7.3 | renumbered around them | 258 |

Output: 65 module docs (one page each), 65 group files, a full renumber, and the generated
manifest, requirements, AI graders and module docs regenerated. Checkpoint: module pages render
with the right screens, gates pass, `npm test` green.

## Phase 3 — Author unit 5 (3-4 days)

| Work | Count |
| --- | --- |
| Pinball sub-builds: score once, end/start, one sound, float-and-die, two masses | 5 |
| Flappy sub-builds: gravity and a tap, spawn/recycle, score once | 3 |
| Snake sub-builds: step on a grid, one longer snake, am I in my own tail | 3 |
| 5.17 Build your own | 1 |

**Pilot rule:** the Pinball chain goes first, end to end — 5.3 to 5.9 with carry-forward between
every module — before Flappy or Snake copy the pattern.

## Phase 4 — Unit 6 (4-5 days)

| Work | Count |
| --- | --- |
| Pocket: 14 lessons + 4 sub-builds | 18 |
| Sling: 13 lessons + 4 sub-builds | 17 |
| Climb: 14 lessons + 4 sub-builds (optional arc, still authored) | 18 |
| 6.28 Build your own | 1 |

## Phase 5 — Unit 7 (3 days)

| Work | Count |
| --- | --- |
| Breakout refactor: the three classes, the brick list, playtest/check | 3 |
| Defender C split: design, three classes, removal in one place, close (re-home 10 lessons) | 0 new |
| 7.21 Build your own | 1 |

## Phase 6 — Integration and release (2-3 days per unit)

Per unit: three lens walks, one fix round, regenerate, gates, `npm test` with the dev server
stopped, module rows for that unit's **core** modules only, deploy, live walk with a throwaway
student, handoff entry.

---

## Totals

| | Count |
| --- | --- |
| New lessons authored | **73** (25 sub-builds, 41 game lessons, 3 refactor labs, 3 capstones, 1 unit-6 capstone) |
| Lessons re-homed | 341, no folder changes |
| New module docs | 65 |
| New group files | 65 |
| Estimated effort | **16-20 working days**, parallelisable to ~10 with two builders |
| Releases | 3 (after units 5, 6, 7) |

## Order and dependencies

```
Phase 0 decisions
   -> Phase 1 machinery (carry-forward, split tool)     [blocks everything]
      -> Phase 2 migration, all 65 modules scaffolded   [blocks authoring]
         -> Phase 3 unit 5 authoring + Pinball pilot
            -> Phase 4 unit 6 authoring   (parallel with 5 with a second builder)
               -> Phase 5 unit 7 authoring
                  -> Phase 6 integration, one release per unit
```

Phases 4 and 5 can run beside phase 3 once the pilot proves the pattern; they depend on the
migration, not on each other.

## Risks

- **65 modules is a lot of surface for the module list.** Each needs a one-page doc, a group file
  and a number; `check-lesson-groups` and `check-slot-map` are the safety net.
- **The split tool is new code doing a bulk rewrite.** It gets a dry run, a diff review and the
  same one-pass table discipline as `repartition-units.mjs`.
- **Carry-forward is the load-bearing feature**; without it every module boundary re-seeds from
  the reference and the chain is cosmetic.
- **Optional modules still need gating**, or they rot before anyone assigns them.
