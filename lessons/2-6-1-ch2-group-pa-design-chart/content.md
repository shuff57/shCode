## Chapter 2 Group PA — Part 1 of 3: Design the Plan

**This is the assessment for the whole chapter, and you are doing it in pairs.** Three
thirds: plan, build, demo. This is the planning third, it is worth **25%**, and it comes
first. Neither of you opens an editor for Part 2 until this plan is done.

**What you'll be assessed on here:**
- Agreeing on what the program does *before* either of you types
- Turning a word problem into a pseudocode plan: the inputs, a loop that walks them, the
  skip or the stop the problem forces, a three-way classification, and a guard
- Using the chapter's tools in plain language: loops (§2.2), `continue` and `break`
  (§2.4), `switch` and `throw`

### Step 1: pick one problem

Four problems. Pick **one**. They are the same difficulty and the same shape: take one or
two inputs, walk something with a loop, decide inside the loop, classify one result with
a `switch`, guard the input that can be bad, report a running total and a verdict. Check
with the pair next to you first — two adjacent tables should not build the same one.

---

**1. Locker Sweep**

You are checking a row of lockers numbered `1..n`. Each locker starts closed. You walk
down the row once: if a locker number is a multiple of 3, you `continue` (skip it);
otherwise you flip its state (closed → open, open → closed). After the walk, classify
**locker number 7** — open, closed, or never touched — using a `switch`. Guard against
a bad `n` (throw if `n < 1`).

---

**2. Word Audit**

You are analyzing a word. Walk it character by character: `continue` past any space
character; for every other character, classify it as vowel / digit / other using a
`switch` and keep three running counts. After the loop, report all three counts and
the word itself. `throw` on an empty string.

---

**3. Savings Run**

You are saving for a target. Each week you deposit a fixed amount. `continue` past the
weeks where the week number is a multiple of 4 (those are "no-deposit" weeks). `break`
the moment your running total reaches or exceeds the target. After the loop, use a
`switch` to classify the outcome — hit early, hit on the last week, or missed — and
report the final balance. `throw` on a negative target.

---

**4. Coin Drawer**

You are making change from an amount. The drawer has a limited supply of quarters,
dimes, nickels, and pennies. A `while` loop dispenses the largest denomination that
fits until the amount reaches zero or the drawer runs dry (`break` when the drawer is
empty). The `switch` names each denomination as it is dispensed. Report the count of
each coin. `throw` on a negative amount.

---

Whichever you pick, your program also needs one piece of **text** — the name of the
locker bank, the word being audited, the savings goal, or the coin system. Pick one
and write it down now; Part 2 asks for it.

### Step 2: write the plan, together

One screen, one keyboard, both of you looking at it and talking it through out loud.
Type your plan into the editor, under your problem name and your list of inputs. The
keywords from 2.2 still apply (`START`, `INPUT`, `SET`, `IF`, `ELSE`, `END IF`, `PRINT`,
`END`), and this chapter adds the loop and the jumps:

- **One instruction per line.** A line doing two things gets split.
- **A loop is a loop line with its repeating steps indented under it.** Write the setup
  on the loop line (`FOR i = 1 TO n`, `FOR EACH character IN word`, `WHILE amount > 0`,
  or your own words). Everything that happens on each pass is indented under it. The
  line that comes after the loop's last step is **not** indented: that is the way out.
- **Skip and stop.** `CONTINUE` skips the rest of this pass; `BREAK` leaves the loop.
  Put each one under the `IF` that triggers it.
- **A `switch` is `SWITCH` with one `CASE` per outcome**, or a chain of `IF` / `ELSE IF`
  lines that does the same job. Either is fine; every outcome needs its own report.
- **A guard is an `IF` near the top** that checks the input that can be bad and
  `THROW`s (or stops) before the loop starts.

An example of the shape, for a different problem (a bus that fills up):

```
START
INPUT capacity
INPUT stops
IF capacity < 1
    THROW "the bus needs room for someone"
END IF
SET riders TO 0
FOR EACH stop IN stops
    IF nobody is waiting at stop
        CONTINUE
    END IF
    SET riders TO riders + the number waiting at stop
    IF riders >= capacity
        BREAK
    END IF
END FOR
IF riders >= capacity
    PRINT "full"
ELSE IF riders > 0
    PRINT "part full"
ELSE
    PRINT "empty"
END IF
PRINT riders
END
```

Open the **Flow Chart** above the editor to see the same plan drawn as a flowchart. It is
read-only and it is for the bus, not for any of the four problems: yours has a different
walk, a different skip or stop, and a different set of outcomes, but the same four parts.

Your plan needs all four of these:

1. **A loop that walks the problem's input** — the lockers, the characters, the weeks, or
   the coins — with the work for each pass indented under the loop line and the way out
   after it.
2. **The skip or the stop your problem forces** — the multiple-of-3 skip, the space skip,
   the no-deposit week and the early stop, the drawer-empty stop — each under the
   condition that triggers it.
3. **A classification and a report after the loop** — every outcome your problem names
   gets its own line of report (the state of locker 7, the three counts, the final
   balance and its verdict, the count of each coin), all before `END`.
4. **A guard against the bad input** — the check for `n < 1`, an empty word, or a negative
   target or amount, near the start, with what happens when it fails.

### What "done in four minutes" means

It means you wrote a straight line and called it a plan. A plan with no loop, or a loop
whose steps change nothing (`do stuff`), or a classification that never reports, solves
no problem, however many lines it has. Read your own plan top to bottom the way the
computer would.

### The part people get wrong

**The skip and the stop are different.** `CONTINUE` goes on to the *next* pass; `BREAK`
leaves the loop for good. A plan that swaps them describes a different program.

**Every outcome has to be reachable.** A locker that is *not* a multiple of 3 is still an
answer, and the plan has to say so. If one of your three outcomes has no condition that
leads to it, the plan cannot ever report it.

**The classification belongs after the loop, not inside it.** Whatever happens once per
item is indented under the loop. Whatever happens once at the end is not.

**The guard comes first.** If the check for a bad input sits after the loop, the loop has
already run on it.

### Before you submit

**You get three tries.** Each partner submits their own: submit, read the feedback on
whether the plan answers your problem, rewrite it and submit again. Your best try counts.
After your third try you can see how it is solved, once your teacher releases it.

Exact wording does not matter, and neither does spelling. Before you call it done, walk
one set of real numbers through the plan out loud, and then a second set that comes out
by a different outcome. Part 2 will open your saved plan beside your code, so write
something you will want to read again.
