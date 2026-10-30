# Investigation progress (loop state)

Each loop iteration does the NEXT unchecked item, ticks it, appends findings below.
Rules: one walker on the `codehs` session; foreground inside run_in_background, never `&`;
verify a .done marker, not the "completed" notice; no CodeHS text/code in the repo.

- [x] 1. AP CSA 3.3-3.9 read (activities + typical solutions) -> csa-3.3-3.9.md
- [x] 2. Spot-check lesson counts (VGD 74, CSP 106, CSA 61) and fit tallies
- [x] 3. Fix CODEHS-SEEDING.md / CODEHS-MAP.md (p5play code, JSGameLib prose)
- [x] 4. PLACEMENT.md (units 5, 6, 7 + concepts block, open decisions)
- [x] 5. moSHion repo gap review -> MOSHION-GAPS.md
- [x] 6. Update HANDOFF.md, commit

## Findings log
- 2026-10-30: GD Mini Golf (42), Projectiles (45), Jumper (62) read; solutions exist in the More tab as "Typical Solution" (screenshot only).
- 2026-10-30 iter1: item 1 done. CSA module 3 read (97 of 97, none missing). Notes in csa-3.3-3.9.md. CSA exercises are skeleton-plus-runner; typical solutions seen for 3 exercises only (static counter, this, plain class), the rest by title.
- 2026-10-30 iter1: item 2 done for COUNTS: public explore pages give CSA 61 lessons/4 modules, VGD 74/17, CSP 106/19, GD 37/6, all matching the agents. Fit tallies are agent judgment and were NOT independently checked. Item 3 done: p5play code / JSGameLib prose noted in CODEHS-SEEDING.md and CODEHS-MAP.md; 'old name' is unconfirmed and says so.
- 2026-10-30 iter1: item 4 done. PLACEMENT.md written: proposed rows plus 12 open decisions for the owner, none decided.
- 2026-10-30 iter2: item 5 done. MOSHION-GAPS.md written by a subagent. Checked by me: vendored copy drifts 223 lines from the repo and lacks coin.wav/music.wav/tile textures; no camera.follow exists (and lesson 6.4.19 line ~103 wrongly hints there may be one); `speed` is a built-in Sprite accessor so `this.speed` on an extends-Sprite class collides. NOT reproduced by me: 33 ms/frame at 600 sprites, overlaps()-vs-p5play semantics, ground-check firing on walls, prompt() in the sandbox.
