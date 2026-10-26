## Chapter 1 Group PA — Part 1 of 3: Design the Plan

**This is the assessment for the whole chapter, and you are doing it in pairs.** Three
thirds: plan, build, demo. This is the planning third, it is worth **25%**, and it comes
first. Neither of you opens an editor for Part 2 until this plan is done.

**What you'll be assessed on here:**
- Agreeing on what the program does *before* either of you types
- Turning a word problem into pseudocode, using the keywords from 1.5.19 and the two
  rules from 1.5.20
- A plan that takes in the inputs, works out one value, compares it against the problem's
  limit, and says something different on each side of the comparison

### Step 1: pick one problem

Four problems. Pick **one**. They are the same difficulty and the same shape: take some
numbers, work out one value, compare that value against a fixed limit. Check with the pair
next to you first — two adjacent tables should not build the same one.

---

**1. Slice Economics**

You are deciding whether a pizza is worth it. You know the pizza's price, how many
slices it is cut into, and the name of the place selling it. Work out the **cost per
slice**, and compare it against a good-deal limit of **$2.00 a slice**.
At or under $2.00 a slice is a good deal; a pizza that costs exactly $2.00 a slice counts.

**2. Split the Check**

A group is splitting a restaurant bill. You know the bill total, the tip percentage
they agreed on, and how many people are paying. Work out the **cost per person after
tip**, and compare it against the **$15.00** each person said they were willing to spend.
At or under $15.00 is fine; over it is not.

**3. Grade Forecast**

A course grade is three categories with different weights: homework is 30%, labs are
30%, and the test is 40%. You know the student's percentage in each. Work out the
**weighted course average**, and compare it against the passing mark of **70**.
A 70 or more passes.

**4. Fuel Stop**

You are checking whether a road trip needs a gas stop. You know the car's miles per
gallon and how many gallons the tank holds. Work out **how far one full tank goes**,
and compare it against the trip you have already committed to: **275 miles**.
If the tank goes 275 miles or more, no stop is needed.

Whichever you pick, your program also needs one piece of **text** — the name of the
pizzeria, the restaurant, the student, or the car. Pick one and write it down now;
Part 2 asks for it. Put it in your plan as one of the things you take in.

---

### Step 2: write the plan, together

Both of you, one keyboard, out loud. Type the plan into the editor, under the **Problem**
and **Partners** lines. Use the keywords from 1.5.19 and keep to the two rules in 1.5.20:

```
START
INPUT ...
INPUT ...
SET ... TO ...
IF ... THEN
    PRINT ...
ELSE
    PRINT ...
END IF
END
```

- **One instruction per line.** A line doing two things gets split.
- **Indent what is inside something else.** The line under `IF` and the line under `ELSE`
  are each indented. `END IF` and `END` are not.

An example of the shape, for a different problem (a bus pass: is a monthly pass cheaper
per ride than the $2.50 single fare?):

```
START
INPUT pass price
INPUT number of rides
SET cost per ride TO pass price / number of rides
IF cost per ride <= 2.50 THEN
    PRINT "The pass is the better deal"
ELSE
    PRINT "Single fares are cheaper"
END IF
END
```

Open the **Flow Chart** above the editor to see the same plan drawn as a flowchart. It is
read-only, and it is for the bus pass, not for any of the four problems. Yours has
different inputs and a different value, but the same shape.

Your plan needs all three of these:

1. **Take in the inputs, then work out the one value.** Every number the problem hands you,
   plus your one piece of text, each on its own line, and then a `SET` line that says
   *how* the value is worked out (`SET cost per slice TO price / slices`, not just
   "calculate").
2. **Compare it against the problem's own limit.** An `IF` line that asks whether the
   value is over, under, or at the limit the problem names.
3. **A different report on each side.** One `PRINT` under the `IF` and a different one
   under the `ELSE`, and then `END`.

You will keep this sheet. Part 2 opens it beside your code, so write something you will
want to read again.

### The argument is the point

If the two of you disagree about the order of the steps, or about what the comparison
actually is, settle it here. That disagreement is cheap in a plan and expensive in code,
and it is the whole reason this assessment is paired.

### The part people get wrong

**Both sides of the comparison have to say something.** A pizza that is *not* a good deal
is still an answer, and the program has to say so.

**The limit points one way.** "At or under" for money you do not want to exceed, "at or
over" for a pass mark or a distance you need to reach. If your `IF` asks the opposite
question, its two reports have to be swapped to match.

**Show the arithmetic.** A line that says "work it out" shows nothing. Say what is
divided by what.

### Before you submit

**You get three tries.** Each partner submits their own: submit, read the feedback on
whether your plan answers your problem, rewrite it and submit again. Your best try counts.
After your third try you can see how it is solved, once your teacher releases it.

Exact wording does not matter, and neither does spelling. Before you call it done, walk
one set of real numbers through it out loud, and then a second set that comes out on the
other side of the `IF`.
