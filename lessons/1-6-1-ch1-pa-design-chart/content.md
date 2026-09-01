## Chapter 1 Group PA — Part 1 of 3: Design

**This is the assessment for the whole chapter, and you are doing it in pairs.** Three
thirds: design, build, demo. This is the design third, it is worth **25%**, and it comes
first. Neither of you opens an editor until this chart is green.

**What you'll be assessed on here:**
- Agreeing on what the program does *before* either of you types
- Turning a word problem into pseudocode, then into a chart
- Using only the three shapes from 1.5.25 — oval, rectangle, diamond

### Step 1: pick one problem

Four problems. Pick **one**. They are the same difficulty and the same shape: take some
numbers, work out one value, compare that value against a fixed limit. Check with the
pair next to you first — two adjacent tables should not build the same one.

---

**1. Slice Economics**

You are deciding whether a pizza is worth it. You know the pizza's price, how many
slices it is cut into, and the name of the place selling it. Work out the **cost per
slice**, and compare it against a good-deal limit of **$2.00 a slice**.

**2. Split the Check**

A group is splitting a restaurant bill. You know the bill total, the tip percentage
they agreed on, and how many people are paying. Work out the **cost per person after
tip**, and compare it against the **$15.00** each person said they were willing to spend.

**3. Grade Forecast**

A course grade is three categories with different weights: homework is 30%, labs are
30%, and the test is 40%. You know the student's percentage in each. Work out the
**weighted course average**, and compare it against the passing mark of **70**.

**4. Fuel Stop**

You are checking whether a road trip needs a gas stop. You know the trip distance in
miles, the car's miles per gallon, and how many gallons the tank holds. Work out **how
far one full tank goes**, and compare it against the trip distance.

---

### Step 2: pseudocode it, on paper, together

Before anyone touches the canvas. Both of you, one sheet, out loud. Use the keywords
from 1.5.19 and keep to the two rules in 1.5.20:

```
START
INPUT ...
INPUT ...
SET ... TO ...
IF ... THEN
    ...
ELSE
    ...
END IF
END
```

You will hand this sheet in with the demo, so write it where you can find it again.

**The argument is the point.** If the two of you disagree about the order of the steps,
or about what the comparison actually is, settle it here. That disagreement is cheap on
paper and expensive in code, and it is the whole reason this assessment is paired.

### Step 3: chart it

One screen, one keyboard, both of you looking at it. Three shapes only (1.5.25):

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | Getting the numbers, working out the value, reporting the result. At least three. |
| **Decision** (diamond) | The comparison against the limit. Label both exits. |

The toolbar also offers a parallelogram for input and output. You may use it, and
nothing requires it: Chapter 1 is assessed on the three shapes above.

### What "green in four minutes" means

It means you drew a straight line and called it a design. **Ten checks run**, and two of
them exist specifically to stop that: your chart needs at least three task rectangles
and at least one diamond. A chart that passes those and still took four minutes is
missing the reporting step — what does the program actually *say* to the person using it,
on each side of the diamond?

### The part people get wrong

**Both exits of the diamond have to arrive somewhere.** A pizza that is *not* a good deal
is still an answer, and the program has to say so. An arrow that leads nowhere is your
chart claiming the program hangs.

**The comparison is a step, not a shape you skip past.** In 1.2.18 you saw that a
comparison produces a boolean — an actual value, `true` or `false`, that you can store
and print. That is what the diamond is standing for here, and in Part 2 it is the one
line of your program that does not look like arithmetic.

### Before you submit

Press **Check my diagram**. Everything runs in your browser and tells you which shape is
wrong. Fix anything red and press it again — there is no penalty for redrawing, exactly
as in 1.5.30.

Green means your drawing is a legal flowchart. Whether it solves *your* problem is for
the two of you to read. Before you call it done, walk one set of real numbers through it
out loud, and then a second set that comes out on the other side of the diamond.
