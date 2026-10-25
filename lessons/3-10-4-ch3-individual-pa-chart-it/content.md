## Chapter 3 Individual PA — Part 4 of 5: Plan It

**This is the planning part of the test, and you are doing it alone.** One problem, pick
one of three, write the plan in pseudocode, **10 points**, about **7 minutes**. You type
the plan in the editor and submit. Each time you submit, the AI marks whether your
plan answers the problem you picked.

**Plan It is the plan, not the code.** This part is pseudocode: plain English arranged
like code. **No JavaScript is needed**, and none is rewarded. Part 5 (3.10.5, right after
this one) is where you write the real JavaScript for the same kind of problem, so a good
plan here makes that part easier. The 10 points reward the structure of the plan, not
the syntax.

**You get three tries.** Submit, read the feedback, rewrite and submit again. Your best try
counts. After your third try you can see how it is solved, once your teacher releases it.

**Three problems. Pick one.** They are the same difficulty and the same shape: a list of records with a name and one
number, a total, then three outcomes. Check with
the person next to you first -- adjacent tables should not pick the same one.

---

### 1. Price Check

A cart is a list of items, each with a name and a price. Walk the cart, adding each price
to the total cost. If the total is over a spending limit, report **over**; if it is exactly
the limit, report **at the limit**; otherwise report **under**.

---

### 2. Reading Log

A week is a list of nights, each with a day and the minutes read. Walk the week, adding
each night's minutes to a total. If the total is over the weekly goal, report **beaten**;
if it lands exactly on the goal, report **on the nose**; otherwise report **short**.

---

### 3. Watering Rota

A rota is a list of plants, each with a name and the millilitres it takes. Walk the rota,
adding each plant's water to a total, then compare it against what the can holds. Report
whether one fill is **enough**, **exactly enough**, or **not enough**.

---

### The two rules of pseudocode

- **One instruction per line.** A line doing two things gets split.
- **Indent what sits inside something else.** The lines that repeat go under the loop
  line; the lines for each outcome go under that outcome. Moving a line in or out
  describes a different plan.

### What your plan needs

- **Named functions.** Chapter 3 is about functions, so the plan calls them by name.
  **Call at least two** (for example one that totals and one that reports or decides),
  and give each a name that says its job, like `totalCost` or `checkLimit`. You do not
  write the inside of a function here; you only call it.
- **A loop over the list.** One line that walks the list, with the lines that repeat
  indented under it, including the step that adds each item or day to the running
  total.
- **One comparison, after the loop.** Compare the finished total against the limit
  once, and report **every** outcome the problem names, each under the condition that
  leads to it.

Open the **Flow Chart** above the editor for the plan of a different problem, a bake sale
(add up the cookies on each tray and compare the total with the order). It is read-only: it
shows the shape your plan should have, not the answer to any of the three problems.

---

### What the 10 points are for

| Points | What earns them |
| ---: | --- |
| 5 | At least two named functions, each called, each name saying its job, each on the path that produces the answer |
| 5 | A loop that adds each item to the total, then one comparison after it that reports every outcome |

Exact wording does not matter, and neither do spelling or neat layout. A plan that puts
the comparison inside the loop, reverses an outcome, or reports words from a different
problem does not solve the problem, even when it has all the right pieces.

### Before you submit

Walk one set of real values through your plan out loud. Does the loop run the right
number of times? Does the total reach the comparison only once the whole list is added?
Does each outcome get its own report? Does each function name say a job that could
really own that line?
