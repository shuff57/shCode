## Chapter 2 Individual PA — Part 4 of 5: Chart It

**This is the design part of the test, and you are doing it alone.** One problem, pick
one of three, draw the flowchart, **10 points**, about **7 minutes**. You draw the chart in the editor below, press
**Check my diagram** as many times as you like, and submit. The checker judges
whether your drawing is a legal flowchart -- never whether it answers the problem.
Whether the loop is right is for you to read; the teacher grades the submitted chart.

**Five shapes are legal on this chart** (Appendix D §D.2): oval, rectangle, diamond,
parallelogram, and the **loop-setup hexagon** (released at §2.2). The double-rail
(`[[ ]]`) and connector/comment shapes are **not released** and must not appear.

**Three problems. Pick one. They are the same difficulty and the same shape.** Check
with the person next to you first -- adjacent tables should not pick the same one.

---

### 1. Step Counter

You are building a step counter. You know the daily goal and the steps taken so far.
Work out the **steps remaining**, and compare it against the **daily goal**. Report
whether the goal is met, exceeded, or not yet reached. Use a `switch` to classify the
outcome.

---

### 2. Battery Life

You are checking a device's battery. You know the battery percentage and the hours of
use per charge. Work out the **hours remaining**, and compare it against the **trip
duration**. Report whether the battery will last, is exactly enough, or will die early.
Use a `switch` to classify the outcome.

---

### 3. Tip Calculator

You are splitting a tip. You know the bill total, the tip percentage, and the number
of people. Work out the **tip per person**, and compare it against the **maximum each
person agreed to pay**. Report whether the tip is acceptable, tight, or too high. Use
a `switch` to classify the outcome.

---

### Rules for your chart

- **Five shapes only:** oval, rectangle, diamond, parallelogram, hexagon.
- **Loop setup uses the hexagon** — your chart must include a `for` or `while` loop.
- **At least one decision diamond** — the comparison against the limit.
- **At least two task rectangles** (the hexagon does not count).
- **Both exits of every diamond labeled** (yes/no, true/false, etc.).
- **No `[[ ]]` double-rail, no connectors, no comments** — not released yet.

---

### What "green" means here

Eleven structural checks run, the same ones the whole course uses. A legal chart
clears them all -- but a chart with no loop in it clears them too, and the lesson
text cannot see that. Draw the loop; the hexagon is the point of the chapter. A chart with a tight `while` (diamond → body → back to diamond, no hexagon)
passes all eleven checks (the rules judge legality, not chapter membership) but will be graded down on the rubric -- the hexagon is the
point of this chapter.

### Before you submit

Walk one set of real numbers through your chart out loud. Does the loop run the right
number of times? Does the decision send the right values down each branch? Does the
`switch` handle all three outcomes?