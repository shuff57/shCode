# Pacing proposal: Unit 5 (5.1 to 5.11)

For the owner's decision. Nothing here has been applied: no `week` field in `lessons/*/lesson.json`
or `weeks:` in `curriculum/modules/*.md` was changed. This answers PLACEMENT.md open question 11 and
CAPSTONE-SPEC.md's open item 1 ("Six hours on top of 5.7 and 5.8").

Measured 2026-10-31 at HEAD `cd66effa`, from every `lessons/*/lesson.json` whose title starts `5.N.`.

## What a week is supposed to hold

- **One class meeting is ~1.75 contact hours** (5.1 and 5.6 module headers; HANDOFF.md's "the 5.3/5.4
  note's ~1.75 contact hours", which is the old numbering for today's 5.6/5.7).
- **One week is ~3.5 contact hours, two sessions** (BOOK-TO-MODULE.md, "a sub-module is one week
  (~3.5 hours, 2 sessions)"; 6.1's header says the same).
- **`estimateMins` is not contact time, and the whole course shows it.** Q1's full weeks carry 13 to 17
  hours of `estimateMins` each (weeks 6, 7, 8: 13.2 h, 16.8 h, 14.3 h). So a module's estimate cannot be
  compared with 1.75 or 3.5 hours directly; the estimates assume work outside the room. The useful
  yardstick is relative: **Q2 as a whole (5.x, 6.x, 7.1) carries 3,956 min, 65.9 h, over weeks 10 to 18,
  so an average Q2 week holds about 440 min (7.3 h).** A week far above that is the problem, whichever
  way the estimates are read.

## The numbers

| Module | Lessons | `estimateMins` | h:mm | x one meeting (1.75 h) | Module doc `weeks:` | lesson.json `week` |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| 5.1 Hello Sprite and Movement | 24 | 253 | 4:13 | 2.4 | [10, 11] | 10 (23), none (1) |
| 5.2 Physics Feel | 20 | 311 | 5:11 | 3.0 | [15] | 15 (20) |
| 5.3 Pinball | 12 | 132 | 2:12 | 1.3 | [11] | 11 |
| 5.4 Flappy | 11 | 128 | 2:08 | 1.2 | [11] | 11 |
| 5.5 Snake | 11 | 133 | 2:13 | 1.3 | [11] | 11 |
| 5.6 Classes and Instances | 16 | 128 | 2:08 | 1.2 | [12] | 12 (15), none (1) |
| **5.7 Writing Your Own Classes** | 22 | **285** | **4:45** | **2.7** | [16] | 12 (20), none (2) |
| **5.8 Inside a Class** | 20 | **195** | **3:15** | **1.9** | [12] | 12 |
| 5.9 Defender A | 8 | 89 | 1:29 | 0.8 | [12] | 12 |
| 5.10 Defender B | 9 | 115 | 1:55 | 1.1 | [12] | 12 |
| 5.11 Defender C | 9 | 152 | 2:32 | 1.4 | [12] | 12 |
| **Defender, 5.9 to 5.11** | 26 | **356** | **5:56** | **3.4** | | |
| **Unit 5 total** | **162** | **1,921** | **32:01** | | | |

Every Unit 5 lesson already has `points: 0` or `grading.totalPoints: 0` (5.7.19 and 5.7.20 included), so
"make it 0-point" is not a lever here; "assign it as an extension, not in class time" is.

### Today's schedule, read off the `week` fields

| Week | Unit 5 in it | Unit 6/7 in it | Total | x Q2 average |
| --- | --- | --- | ---: | ---: |
| 10 | 5.1 (253) | | 253 | 0.6 |
| 11 | 5.3, 5.4, 5.5 (393) | | 393 | 0.9 |
| **12** | **5.6, 5.7, 5.8, 5.9, 5.10, 5.11 (964)** | | **964 (16.1 h)** | **2.2** |
| 13 | | 6.1, 6.2 (184) | 184 | 0.4 |
| 14 | | 6.3 (148) | 148 | 0.3 |
| 15 | 5.2 (311) | 6.4 (259) | 570 | 1.3 |
| 16 | | 6.5 (364) | 364 | 0.8 |
| 17 | | 6.6, 6.7, 6.8 (760) | 760 | 1.7 |
| 18 | | 7.1 (320) | 320 | 0.7 |

### Defects the table shows, whichever option is chosen

1. **Week 12 holds six modules and 16 hours.** 5.7, 5.8 and all of Defender were each placed at 12 as a
   placeholder (CAPSTONE-SPEC.md says so for Defender). It is the heaviest week in Q2 by a wide margin.
2. **5.2 is at week 15, after 5.3 to 5.11.** The owner decided on 2026-10-30 that 5.2 opens with the
   random-numbers-and-timers lesson so it "precedes the builds that use it (5.3-5.5)" (PLACEMENT.md,
   decision 3). A week-15 field contradicts that; 5.2 has to sit at week 10 or 11.
3. **Weeks 13 and 14 are nearly empty** (184 and 148 min). That is where the room is.
4. **Module doc `weeks:` disagree with the lessons** in three places: 5.1 says [10, 11] (lessons: 10),
   5.7 says [16] (lessons: 12), and outside Unit 5, 6.2 says [19] and 6.8 says [21] while their lessons say
   13 and 17. Whatever is chosen, the docs and the lessons should be set to the same number in one pass.
5. Four Unit 5 lessons have no `week` at all (one each in 5.1 and 5.6, two in 5.7).

## Options

All three keep the module order 5.1, 5.2, 5.3 ... 5.11, then 6.1, which the module docs now state.

### Option A: keep, fix only the order

Leave Unit 5 in weeks 10 to 12; move 5.2 to week 10 so it precedes 5.3. Week 10 becomes 564 min (9.4 h)
and week 12 stays 964 min (16.1 h). Unit 6 does not move. Works only if most of 5.7, 5.8 and Defender is
homework; on 3.5 contact hours, week 12 is about four and a half weeks of class.

### Option B: spread Unit 5 into the empty weeks (recommended)

Use weeks 13 and 14, which Unit 6 barely fills. Put 6.1, 6.2 and 6.3 together in week 15 (332 min; 6.1 and
6.2 already shared a week under BOOK-TO-MODULE's "one week of class" rule) and pair 6.4 with 6.5 in week 16.
Weeks 17 and 18 do not change.

5.7 gets a week of its own (13). 5.8 shares week 14 with Defender Part A; Parts B and C share week 15
with 6.1 to 6.3, so the capstone ends in the week Groups begins, which is the order 6.1's doc now states.

### Option C: B plus trims to the procedural-vs-OOP overlap

Defender now teaches with the student's own code what 5.7.15 to 5.7.20 teach on a worked example: 5.10 is
the parallel-array version, 5.11.1 "Count the cost" puts numbers on it. Assign these as extensions rather
than in class:

| Lesson | Mins | Note |
| --- | ---: | --- |
| 5.7.16 Worked Example: Procedural vs OOP side-by-side | 15 | 5.7.18's reading and CAPSTONE-SPEC.md cite it; both would need a one-line touch |
| 5.7.17 Read the Charts: Three Variables or Three Objects | 15 | nothing else cites it |
| 5.7.20 Procedural vs OOP Writeup | 40 | 5.11.7 is the written reflection on the same question, on the student's own game |
| 5.7.22 Challenges | 30 | extension by nature |
| 5.11.9 Challenges: Make it yours | 25 | extension by nature; it is the 5.11 close, so the module doc's "closes on challenges" line would change |

Keep **5.7.15** (5.10.1 and the 5.10 module doc depend on it). The trims save **125 min**: 5.7 drops to
185 (3:05) and Defender to 331 (5:31). With them, 5.7 and 5.8 share week 13, all of Defender fits in week 14,
Unit 5 ends at week 14, and only 6.1 to 6.4 move (6.5 keeps week 16 to itself).

### Recommended week per module

| Module | Mins | Today | A: keep | **B: spread (rec.)** | C: spread + trim |
| --- | ---: | --- | --- | --- | --- |
| 5.1 | 253 | 10 | 10 | **10** | 10 |
| 5.2 | 311 | 15 | 10 | **11** | 11 |
| 5.3 | 132 | 11 | 11 | **11** | 11 |
| 5.4 | 128 | 11 | 11 | **12** | 12 |
| 5.5 | 133 | 11 | 11 | **12** | 12 |
| 5.6 | 128 | 12 | 12 | **12** | 12 |
| 5.7 | 285 (C: 185) | 12 | 12 | **13** | 13 |
| 5.8 | 195 | 12 | 12 | **14** | 13 |
| 5.9 | 89 | 12 | 12 | **14** | 14 |
| 5.10 | 115 | 12 | 12 | **15** | 14 |
| 5.11 | 152 (C: 127) | 12 | 12 | **15** | 14 |
| 6.1, 6.2, 6.3 | 332 | 13, 13, 14 | unchanged | **15** | 15 |
| 6.4 | 259 | 15 | unchanged | **16** | 15 |
| 6.5 | 364 | 16 | unchanged | **16** | 16 |
| 6.6, 6.7, 6.8 | 760 | 17 | unchanged | **17** | 17 |
| 7.1 | 320 | 18 | unchanged | **18** | 18 |

Resulting load per week (min, and multiple of the 440-min Q2 average):

| Week | A | B | C |
| --- | --- | --- | --- |
| 10 | 564 (1.3) | 253 (0.6) | 253 (0.6) |
| 11 | 393 (0.9) | 443 (1.0) | 443 (1.0) |
| 12 | **964 (2.2)** | 389 (0.9) | 389 (0.9) |
| 13 | 184 (0.4) | 285 (0.6) | 380 (0.9) |
| 14 | 148 (0.3) | 284 (0.6) | 331 (0.8) |
| 15 | 259 (0.6) | 599 (1.4) | 591 (1.3) |
| 16 | 364 (0.8) | 623 (1.4) | 364 (0.8) |
| 17 | 760 (1.7) | 760 (1.7) | 760 (1.7) |
| 18 | 320 (0.7) | 320 (0.7) | 320 (0.7) |

**Why B over C as the recommendation:** B needs no content decision, only `week` numbers, and it ends Unit 5
with Defender Parts B and C in the same week, which is how the capstone was written to run (Part C rebuilds
Part B's game). Its cost is that Unit 6 loses one week: weeks 15 and 16 each carry about 1.4 times the Q2
average. **C** is the better-balanced schedule (no week above 1.3 except week 17, which is already that
heavy today) and keeps Unit 6's 6.5 week whole, but it asks the owner to agree that five 5.7/5.11 screens
become extensions. Either is a large improvement on A's 16-hour week 12.

Week 17 (6.6 to 6.8, 760 min) is the next-heaviest week in Q2 in every option; it is outside Unit 5 and
not addressed here.

## If an option is chosen

- Set the `week` field in every listed module's `lessons/*/lesson.json` and the `weeks:` line in its
  `curriculum/modules/*.md` in the same commit, including the four lessons with no `week` and the stale
  6.2 `[19]` and 6.8 `[21]` doc fields.
- A `week` change is not a lesson-id change: no migration is needed (the folder name is the id).
- Run the generators (`prebuild`) afterwards, since the manifest carries `week`.
