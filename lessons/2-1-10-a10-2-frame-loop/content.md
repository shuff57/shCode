# A10.2 — Understanding the Frame Loop

| | |
|---|---|
| **Module** | 2.1.1 Hello Sprite and Movement |
| **Week** | 10 |
| **Type** | Written |
| **Points** | 5 |
| **Estimated time** | 20 min |
| **SLO** | SLO 3 (support) |
| **Due** | End of Week 10 |

**Before you start:**
- Complete both in-app lessons (`2.1.5 Hello Sprite` + `2.1.9 Make it Move`).
- Read the "Canvas & Sprite" and "Input" chapters of the q5play docs (see [readings](2.1.1_readings.md)).
- The math you need is demonstrated in [Worked Example 3](2.1.1_worked-examples.md#worked-example-3--automatic-motion-with-framecount).

**Other 2.1.1 resources:** [overview](2.1.1_overview.md) · [worked examples](2.1.1_worked-examples.md) · [challenges](2.1.1_challenges.md)

---

## Prompt

Answer all three questions in a typed response of approximately **100–200 words** (half page). You do not need to use full paragraphs — short, clear answers are fine.

### Question 1 (2 pts)
In your own words, what is the difference between `setup()` and `draw()` in a q5play sketch? When does each one run?

### Question 2 (2 pts)
q5play runs at about **60 frames per second** (60 fps).

- If you set `player.vel.x = 4`, how many pixels does the sprite move in **one second**? Show your math.
- How far does it move in **5 seconds**?
- If your canvas is 400 pixels wide, approximately how long until the sprite crosses the whole canvas?

### Question 3 (1 pt)
Why do you think the engine gives us `vel` (velocity) instead of letting us directly set `pos.x` every frame? Give one reason.

---

## Rubric (5 pts)

| Criterion | Pts |
|-----------|-----|
| Q1: Accurate explanation of setup (runs once) vs draw (runs every frame) | 2 |
| Q2: Math shown for both 1-second and 5-second distances; canvas-crossing time given | 2 |
| Q3: At least one sensible reason for using velocity vs direct position | 1 |

**Full credit = 5.** Partial credit awarded for each question independently.
