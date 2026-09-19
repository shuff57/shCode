## Chapter 3 Group PA — Part 1 of 3: Design

**This is the assessment for the whole chapter, and you are doing it in pairs.** Three
thirds: design, build, demo. This is the design third, it is worth **25%**, and it comes
first. Neither of you opens an editor until this chart is green.

**What you'll be assessed on here:**
- Agreeing on the function list *before* either of you types — what goes in, what comes
  back (3.2.2)
- Turning a word problem into a set of function contracts, then into a chart
- Using the six shapes released through §3.1 — oval, rectangle, diamond, parallelogram,
  the loop-setup hexagon (§2.2), and the **double-rail subroutine** (3.1.2)

### Step 1: pick one problem

Four problems. Pick **one**. They are the same difficulty and the same shape: an array
of record objects, and five functions over it — build one record, total the list, select
a subset, transform it to one line per record, and change one record in place — then
save and load the list. Check with the pair next to you first — two adjacent tables
should not build the same one.

---

**1. Snack Shack**

Your stock is an array of items, each `{ name, price, qty }`. Write and use:

- `makeItem(name, price, qty)` — builds one item object and returns it
- `totalValue(list)` — walks the list and returns the total dollar value
- `lowStock(list, level)` — builds and returns a NEW array of items whose `qty` is
  below `level`
- `receiptLines(list)` — returns a NEW array with one line per item, `name xqty`
- `sellItem(list, name)` — finds the item and lowers its `qty` by one, never below zero.
  **This one changes the list it was handed.**
- `saveStock(list)` and `loadStock()` — the whole list goes to localStorage as JSON
  under a key, and comes back.

---

**2. Lap Times**

You are logging a meet. Each runner is `{ name, laps, bestLap }`. Same five jobs: total
every lap logged across the whole team; list the runners above a target time; one result
line per runner (`name: 3 laps, best 42.1`); log one more lap for a named runner
(mutates); save and reload.

---

**3. Seed Tray**

You are tracking a tray of varieties, each `{ variety, planted, sprouted }`. Total the
seeds planted; list the varieties whose sprout rate is under a target percent; one label
line per variety; record one more sprout for a named variety (mutates); save and reload.

---

**4. Library Cart**

A cart of titles, each `{ title, copies, dueInDays }`. Total the copies on the cart;
list what is due back within a limit; one spine line per title; check out one copy of a
named title (mutates — the copy count goes down, never below zero); save and reload.

---

Whichever you pick, your program also needs one **string** of text — the shack's name,
the meet name, the tray label, or the library branch. Pick one and write it down now;
Part 2 asks for it.

---

### Step 2: write the contracts, on paper, together

Before any shape is drawn. One row per function, both of you, out loud. This is 3.2.2
made to do work — a function's signature *is* its contract.

| Function | Takes in | Gives back |
|---|---|---|
| makeItem | | |
| totalValue | | |
| lowStock | | |
| receiptLines | | |
| sellItem | | |
| saveStock / loadStock | | |

Then pseudocode, one function per block. The keywords from 2.2 and the conventions from
3.1 still apply.

```
START
LOAD stock FROM storage          -- or use the seed list
REPORT totalValue(stock)
PUT receiptLines(stock) ON SCREEN
PUT lowStock(stock, LEVEL) ON SCREEN
SELL one of NAME
SAVE stock
END
```

### Step 3: chart it

One screen, one keyboard, both of you looking at it. **Six shapes** (Appendix D §D.2):

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | Getting the data ready, printing the report. **At least two.** |
| **Decision** (diamond) | The comparison inside the loop or the select. Exactly two exits, **labeled**. |
| **Parallelogram** | Input or output — the report and the loaded list. |
| **Hexagon** | Loop setup: `{{i = 0 to list.length - 1}}`. The return arrow closes the loop. |
| **Double-rail** `[[ ]]` | **A function call** — one per named function from your contract table, labeled with the function's name. |

**The checker counts rectangles.** A parallelogram, a hexagon and a double-rail are all
*not* rectangles — that is why "Uses at least two task rectangles" exists, and why the
floor is low. Use each shape for what it means, never in place of a rectangle.

**The double-rail is one shape, not three.** Do not draw the inside of `totalValue` on
this chart — the double-rail means "a function defined somewhere else does this, then we
come back." Drawing the body inline is the most common way to end up with a chart that
has no functions in it.

### What "green" means

**Eleven checks run.** The two that stop a four-minute straight line: at least **two**
task rectangles and at least **one** decision diamond. The checker also demands **ten
shapes in total** — a straight line with one diamond does not clear it, and neither does
a chart whose only shapes are the calls.

### The part people get wrong

**The loop return arrow goes to the hexagon, not to the diamond.** Same as 2.6.1. The
hexagon is the loop header; the return arrow closes the loop by pointing back at it.

**A double-rail has one arrow in and one arrow out.** The function ran and the flow
came back. If your chart shows the double-rail branching, the branch belongs in the
caller's logic, before or after the call.

**The hexagon counts as one shape for `min-nodes`, and so does the double-rail.** One
shape, one meaning, one count.

### Before you submit

Press **Check my diagram**. Everything runs in your browser and tells you which shape is
wrong. Fix anything red and press it again — there is no penalty for redrawing, exactly
as in 3.1.12.

Green means your drawing is a legal flowchart. Whether it solves *your* problem is for
the two of you to read. Before you call it done, walk one record through it out loud —
and then walk the *list*, because the loop is where this chapter's programs stop being
straight lines.