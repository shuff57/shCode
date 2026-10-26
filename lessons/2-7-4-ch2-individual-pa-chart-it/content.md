## Chapter 2 Individual PA — Part 4 of 5: Plan It

**This is the planning part of the test, and you are doing it alone.** One problem, pick
one of three, write the plan in pseudocode, **10 points**, about **7 minutes**. You type
the plan in the editor and submit. Each time you submit, the AI marks whether your plan
answers the problem you picked.

**Plan It is the plan, not the code.** This part is pseudocode: plain English arranged
like code. **No JavaScript is needed**, and none is rewarded. Part 5 (2.7.5, right after
this one) is where you write the real JavaScript for the same kind of problem, so a good
plan here makes that part easier. The 10 points reward the structure of the plan, not
the syntax.

**You get three tries.** Submit, read the feedback, rewrite and submit again. Your best try
counts. After your third try you can see how it is solved, once your teacher releases it.

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

### The rules of pseudocode

- **One instruction per line.** A line doing two things gets split.
- **Indent what sits inside something else.** The lines that repeat go under the loop
  line; the lines for each outcome go under that outcome. The line after the loop's last
  step is not indented: that is the way out. Moving a line in or out describes a
  different plan.
- The keywords from Chapter 1 still work (`START`, `INPUT`, `SET`, `IF`, `ELSE`,
  `END IF`, `PRINT`, `END`), and this chapter adds loops (`FOR`, `FOR EACH`, `WHILE`) and
  `SWITCH` with a `CASE` for each outcome. A chain of `IF` and `ELSE IF` lines does the
  same job as a `SWITCH` and is just as good.

### What your plan needs

- **A real loop.** One line that sets the loop up and says what it counts or walks (the
  days, the readings, the people, the hours), with the steps that repeat indented
  under it, and a way out after it. The problems do not force one loop, so any loop that
  really helps build your answer is fine, as long as its steps change something.
- **The value, and the limit it is compared with.** A step that works out the value the
  problem names (the steps remaining, the hours remaining, the tip per person) from the
  inputs, then a decision that compares it with the problem's own limit (the daily goal,
  the trip duration, the maximum each person agreed to pay).
- **Three outcomes, each reported.** Every outcome the problem names has its own
  condition and its own report, and all of them reach the `END`.

Open the **Flow Chart** above the editor for the plan of a different problem, a game
fund (add up four weeks of savings and compare the total with the price of the game).
It is read-only: it shows the shape your plan should have, not the answer to any of the
three problems.

---

### What the 10 points are for

| Points | What earns them |
| ---: | --- |
| 4 | A real loop: a loop line saying what it counts or walks, steps indented under it that do real work, and a way out after it |
| 3 | The right value worked out from the inputs and compared with the problem's own limit |
| 3 | The problem's three outcomes separated, each with its own report, all reaching the end |

Exact wording does not matter, and neither do spelling or neat layout. A plan that puts
the comparison inside the loop, reverses an outcome, or reports words from a different
problem does not solve the problem, even when it has all the right pieces.

### Before you submit

Walk one set of real numbers through your plan out loud. Does the loop run the right
number of times? Does the value reach the comparison only once the loop is finished?
Does the comparison send the numbers to the right report? Does each of the three
outcomes have a way to be reached?
