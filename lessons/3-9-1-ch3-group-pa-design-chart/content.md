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

Four problems. Pick **one**. They are built to the same measure: a list of records with
the same three fields (a name, a count, and one more number), and the same five jobs plus
save and load: build one record, total the list, select a subset, turn the list into one
line per record, change one record in place. Each total multiplies
the count by the other number; each subset test is one comparison; each change lowers a
count by one and never below zero. Check with the pair next to you first: two adjacent
tables should not build the same one.

---

**1. Snack Shack**

Your stock is an array of items, each `{ name, price, qty }`. Write and use:

- `makeItem(name, price, qty)` returns one item object
- `totalValue(list)` returns the total dollar value (every `price` times its `qty`)
- `lowStock(list, level)` returns a NEW array of the items whose `qty` is below `level`
- `receiptLines(list)` returns a NEW array with one line per item, `name xqty`
- `sellItem(list, name)` lowers that item's `qty` by one, never below zero.
  **This one changes the list it was handed.**
- `saveStock(list)` and `loadStock()`: the whole list goes to localStorage as JSON
  under a key, and comes back.

---

**2. Lap Times**

You are logging a meet. Each runner is `{ name, laps, lapSeconds }`. Write and use:

- `makeRunner(name, laps, lapSeconds)` returns one runner object
- `totalSeconds(list)` returns the seconds run by the whole team (every `laps` times its `lapSeconds`)
- `slowRunners(list, target)` returns a NEW array of the runners whose `lapSeconds` is above `target`
- `resultLines(list)` returns a NEW array with one line per runner, `name: 3 laps`
- `dropLap(list, name)` takes one lap off that runner (the scanner counted it twice), never below zero.
  **This one changes the list it was handed.**
- `saveMeet(list)` and `loadMeet()`: the whole list goes to localStorage as JSON
  under a key, and comes back.

---

**3. Seed Tray**

You are keeping a drawer of seed packets. Each variety is `{ variety, packets, seedsPerPacket }`. Write and use:

- `makeVariety(variety, packets, seedsPerPacket)` returns one variety object
- `totalSeeds(list)` returns the seeds on hand (every `packets` times its `seedsPerPacket`)
- `lowPackets(list, level)` returns a NEW array of the varieties whose `packets` is below `level`
- `labelLines(list)` returns a NEW array with one line per variety, `variety xpackets`
- `sowPacket(list, variety)` lowers that variety's `packets` by one, never below zero.
  **This one changes the list it was handed.**
- `saveTray(list)` and `loadTray()`: the whole list goes to localStorage as JSON
  under a key, and comes back.

---

**4. Library Cart**

A cart of titles, each `{ title, copies, pages }`. Write and use:

- `makeTitle(title, copies, pages)` returns one title object
- `totalPages(list)` returns the pages on the cart (every `copies` times its `pages`)
- `longTitles(list, limit)` returns a NEW array of the titles whose `pages` is above `limit`
- `spineLines(list)` returns a NEW array with one line per title, `title xcopies`
- `checkOut(list, title)` lowers that title's `copies` by one, never below zero.
  **This one changes the list it was handed.**
- `saveCart(list)` and `loadCart()`: the whole list goes to localStorage as JSON
  under a key, and comes back.

---

Whichever you pick, your program also needs one **string** of text: the shack's name,
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

Here is the same plan drawn as a flowchart, so you can see the shape. It is read-only
and it is for the pizza club, not for any of the four problems: yours has different
functions, but the same four parts (named calls, a loop over the list, one change to a
record, a load first and a save last).

```flow readonly caption="Figure 3.9.1: the pizza club plan. Each call is a box with the function's name; the loop is the diamond that goes back until the lines run out."
flowchart TD
  A([Start]) --> B[set members to loadMembers]
  B --> C[set dues to totalDues of members]
  C --> D[/report dues/]
  D --> E[set late to lateMembers of members and the day limit]
  E --> F{is there another line in memberLines of members?}
  F -- yes --> G[/put that line on screen/]
  G --> F
  F -- no --> H[markPaid of members and the name]
  H --> I[/report the new dues for that name/]
  I --> J[saveMembers of members]
  J --> K([End])
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
