## Chart What You Built

**What you'll practise:**
- Drawing a program you already wrote, not one you're planning
- Using the double-rail shape correctly for a real function call
- Seeing your chart get *shorter* once the decisions moved inside the functions

3.1.12 had you chart the grade-advisor **before** you refactored it — a plan. This is the other half: chart it **after**, from the code you actually wrote in 3.1.13.

### The chart is shorter now, and that's the point

Before the refactor, your plan needed a decision diamond for the score chain and another for the attendance check — that's why 3.1.12 required at least one decision and at least seven shapes.

Now that `decideGrade()` and `printAdvice()` exist, the *main* program doesn't branch at all anymore. It just runs three things in order: set up the three variables, call `decideGrade()`, call `printAdvice()`. The branching didn't disappear — it moved *inside* the two functions, which is exactly what 3.1.11's reading warned you not to draw:

> **Do not draw the function's body hanging off the double-rail.** The body is not part of this chart.

So this chart should have **no decision diamonds** in it at all. If you find yourself reaching for one, you're drawing what's inside `decideGrade()` or `printAdvice()` — stop, and collapse it back into the double-rail.

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Input / Output** (parallelogram) | Setting `score`, `attendance`, `lateAssignments`. |
| **Function call** (double rail) | `decideGrade()` and `printAdvice()` — press **+ more shapes** to find it. |

That's the whole chart: five shapes, no diamond, one straight line from Start to End.

### Check it against the code

Hold this chart next to `3-1-19-lab-refactor-grade-advisor`'s script. Every `[[ ]]` on the chart should be a real function call in the code, and both functions you wrote should appear as a `[[ ]]` here — the same one-to-one rule 3.1.12 asked you to follow, now checked in the other direction.

### Before you submit

Press **Check my diagram**. These checks run: one start, one end, every shape labeled, nothing orphaned, the chart reaches End, no shape points back at itself, and at least five shapes total.

A green check does not confirm you used the double-rail shape for both function calls specifically — that's a look-at-it check, not a count-it one. If your chart is green but has fewer than two double-rail shapes, you drew something else instead. Go back and fix it before you call this done.
