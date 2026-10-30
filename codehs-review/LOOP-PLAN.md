# Loop plan: walk and fix the functional game block (5.2-5.5)

## Plan

**Pieces.** Seven pieces, each judged on its own: 5.2.1-5.2.4 (random numbers and timers), 5.2.5-5.2.20 (physics feel), 5.3 Pinball, 5.4 Flappy, 5.5 Snake, the four AI-graded plan/playtest screens (5.3.1, 5.3.11, 5.4.1, 5.4.9, plus 5.5.1 and 5.5.9), and the editors (every lab's starter, solution and hints actually run).

**Bar.** Module 8.1 Solid Shapes: every lesson in it passed the three cs-student lenses in a real browser (record: `.gauntlet/reshape-module-loop.json`). Read that record first and hold 5.2-5.5 to the same standard. Measurable half: every gate green, every lab's reference solution scoring full on its own requirements, every starter scoring below full.

**Rounds.** Per piece: builder (fixes), then three fresh critics in parallel (cs-student-beginner, cs-student-moderate, cs-student-advanced), plus cs-function-audit on the editors. A critic names the single biggest remaining gap. Fix, run the gates, commit one round, walk again.

**Stop.** A piece is done when all three lenses finish it with no stuck point, no "not taught yet" and no grader refusal of a taught answer, and the gates are green. The loop ends when all seven pieces are done, or the user stops it. No round count.

## Prompt

```
Make the new functional game block of shCode pass real student use: modules 5.2 Physics Feel with its new random-numbers-and-timers opener (5.2.1-5.2.4), 5.3 Pinball, 5.4 Flappy and 5.5 Snake, in /home/shuff57/Documents/GitHub/shCode on branch codehs-inspiration. It was just merged and every gate is green, but no student has walked it.

The bar is module 8.1 Solid Shapes in the same app: every lesson in it passed the three cs-student lenses in a real browser, recorded in .gauntlet/reshape-module-loop.json. Read that record first and hold this block to it, plus every gate green and every lab's reference scoring full.

Split into pieces: the random opener, the rest of 5.2, each of 5.3, 5.4, 5.5, the AI-graded plan and playtest screens, and the editors. For each piece, run a builder and fresh critics: cs-student-beginner, cs-student-moderate, cs-student-advanced, and cs-function-audit on the editors. Walk on DEV_ROLE=student npm run dev with a dev_student=<name> cookie per browser. Each critic names the single biggest remaining gap and is harsh. Praise is not useful.

Rules: nothing may be asked that no earlier screen taught. Regex labs and AI grading stay lax, anything remotely related earns full credit. No classes or groups in 5.3-5.5. After each fix regenerate manifest, solutions, starters, ai-graders and quiz keys, then run check-lesson-numbers, check-lesson-groups, check-prompt-pointers, check-help-pointer-titles (10 known old mismatches), check-lesson-citations, check-hints, check-live-blocks, check-starters, check-solution-leak, test-quiz and tsc. Stop the dev server before build or test, and kill it by pid, never pkill -f. Commit each round separately with the trailer Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>. Never commit .gauntlet/occt-checks.json. Do not touch the codehs or mom browser sessions.

/loop on each piece until all three lenses pass it clean. Do not stop before that.

Keep a live progress page updating so I can watch it. End with a short report of what each lens found and what was fixed.

Fan out subagents and ultracode.
```
