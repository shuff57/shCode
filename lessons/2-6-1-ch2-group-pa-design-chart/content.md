## Chapter 2 Group PA — Part 1 of 3: Design

**This is the assessment for the whole chapter, and you are doing it in pairs.** Three
thirds: design, build, demo. This is the design third, it is worth **25%**, and it comes
first. Neither of you opens an editor until this chart is green.

**What you'll be assessed on here:**
- Agreeing on what the program does *before* either of you types
- Turning a word problem into pseudocode, then into a chart
- Using the five shapes released through §2.2 — oval, rectangle, diamond, parallelogram,
  and the **loop-setup hexagon** (§2.2)

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

You are making change from an amount. The drawer has an unlimited supply of quarters,
dimes, nickels, and pennies. A `while` loop dispenses the largest denomination that
fits until the amount reaches zero or the drawer runs dry (`break` when the drawer is
empty). The `switch` names each denomination as it is dispensed. Report the count of
each coin. `throw` on a negative amount.

---

Whichever you pick, your program also needs one piece of **text** — the name of the
locker bank, the word being audited, the savings goal, or the coin system. Pick one
and write it down now; Part 2 asks for it.

---

### Step 2: pseudocode it, on paper, together

Before anyone touches the canvas. Both of you, one sheet, out loud. Use the keywords
from 2.2 and the flowchart conventions from 2.2.6 and 2.2.12.

```
START
INPUT n
INPUT name
SET count TO 0
FOR i = 1 TO n
    IF rule(i) THEN
        CONTINUE
    END IF
    FLIP state of i
    IF i == 7 THEN
        record state
    END IF
END FOR
CLASSIFY state OF 7 WITH switch
REPORT total
END
```

### Step 3: chart it

One screen, one keyboard, both of you looking at it. **Five shapes** (Appendix D §D.2):

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | Getting the numbers, working out the value, printing the result. **At least two.** |
| **Decision** (diamond) | The comparison against the limit. Exactly two exits, **labeled**. |
| **Parallelogram** | Input or output — the name and the final report. |
| **Hexagon** | Loop setup: `{{i = 1 to n}}`. The return arrow closes the loop. |

The toolbar also offers a parallelogram for input and output. The checker counts
**rectangles** — a parallelogram or hexagon is not one. Use them for what they mean,
never in place of a rectangle, or "Uses at least two task rectangles" goes red on a
chart that looks finished.

### What "green in four minutes" means

It means you drew a straight line and called it a design. **Ten checks run**, and two of
them exist specifically to stop that: your chart needs at least **two** task rectangles
and at least **one** decision diamond. A chart that passes those and still took four
minutes is missing the loop setup or the reporting step.

### The part people get wrong

**Both exits of the diamond have to arrive somewhere.** A locker that is *not* a multiple
of 3 is still an answer, and the program has to say so. An arrow that leads nowhere is
your chart claiming the program hangs.

**The loop return arrow goes to the hexagon, not to the diamond.** The hexagon is the
loop header; the return arrow closes the loop by pointing back to the hexagon. Drawing
it back to the diamond is the most common mistake and makes the chart illegal.

**The hexagon counts as one shape for `min-nodes`, not two.** Do not draw the three
parts of the `for` loop (init, condition, increment) as separate shapes — the hexagon
is one shape that means "this is a loop header with its setup inside it."

### Before you submit

Press **Check my diagram**. Everything runs in your browser and tells you which shape is
wrong. Fix anything red and press it again — there is no penalty for redrawing, exactly
as in 2.2.12.

Green means your drawing is a legal flowchart. Whether it solves *your* problem is for
the two of you to read. Before you call it done, walk one set of real numbers through it
out loud, and then a second set that comes out on the other side of the diamond.