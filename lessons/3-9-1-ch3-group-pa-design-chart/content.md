## Chapter 3 Group PA — Part 1 of 3: Design the Plan

**This is the assessment for the whole chapter, and you are doing it in pairs.** Three
thirds: plan, build, demo. This is the planning third, it is worth **25%**, and it comes
first. Neither of you opens an editor for Part 2 until this plan is done.

**What you'll be assessed on here:**
- Agreeing on the function list *before* either of you types — what goes in, what comes
  back (3.2.2)
- Turning a word problem into a set of function contracts, then into pseudocode
- A plan that **calls** your functions by name, walks the list with a loop, changes one
  record and shows the effect, and loads at the start and saves at the end

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

### Step 2: write the contracts, together

Before any pseudocode. One row per function, both of you, out loud. This is 3.2.2
made to do work — a function's signature *is* its contract. (The table is for Snack
Shack; use your own function names if you picked another problem.)

| Function | Takes in | Gives back |
|---|---|---|
| makeItem | | |
| totalValue | | |
| lowStock | | |
| receiptLines | | |
| sellItem | | |
| saveStock / loadStock | | |

### Step 3: write the pseudocode

Now the plan: the short main section of your program, written as pseudocode. Type it
into the answer box below, under your contracts. The keywords from 2.2 and the
conventions from 3.1 still apply:

- **One instruction per line.** A line doing two things gets split.
- **Indent what sits inside something else.** The lines inside a loop or an IF are
  indented; the lines after it are not.
- **Call your functions by name**, handing each one what it needs. Do **not** write out
  the inside of `totalValue` or `lowStock` — a call means "a function written somewhere
  else does this, then we come back." Writing every job out inline is the most common way
  to end up with a plan that has no functions in it.

An example of the shape, for a different problem (a pizza club):

```
START
SET members TO loadMembers()
SET dues TO totalDues(members)
REPORT dues
SET late TO lateMembers(members, DAY_LIMIT)
FOR EACH line IN memberLines(members)
    PUT line ON SCREEN
markPaid(members, NAME)
REPORT the new dues for NAME
saveMembers(members)
END
```

Your plan needs all four of these:

1. **Named function calls** — at least four of your five jobs (build a record, total the
   list, select a subset, one line per record, change one record), each called with the
   list or values it needs and its answer kept or used.
2. **A loop over the list** — `FOR EACH` or your own wording, with the work done on each
   item indented under it.
3. **The change-one-record call** — handed the list and a name, followed by a line that
   reports or uses the changed list, so the effect shows.
4. **Load at the start, save at the end** — the list comes back from storage before you
   use it and goes back to storage when you are done.

### The part people get wrong

**Calls, not insides.** If your plan has no function names in it, it has not shown any
functions.

**Handing over the list.** `sellItem` changes the list it was handed. Your call has to
give it the list and the name, and a later line has to use or report the result.

**The loop's indentation.** Whatever happens once per item goes under the loop. Whatever
happens once after the loop does not.

**Both ends of the round trip.** A load near the top and a save near the bottom. One
without the other is half of it.

### Before you submit

**You get three tries.** Each partner submits their own: submit, read the feedback on
whether your plan covers your problem, rewrite it and submit again. Your best try counts.
After your third try you can see how it is solved, once your teacher releases it.

Exact wording does not matter, and neither does spelling. Before you call it done, walk
one record through your plan out loud — and then walk the *list*, because the loop is
where this chapter's programs stop being straight lines. Part 2 will open your saved
plan beside your code, so write something you will want to read again.
