## Chapter 3 Group PA — Part 1 of 3: Design the Plan

**This is the assessment for the whole chapter, and you are doing it in pairs.** Three
thirds: plan, build, reflect. This is the planning third, it is worth **25%**, and it comes
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

**Then say which one you picked in the box labelled "Your problem" above the editor.** That
loads the plan written in that problem's names, so the skeleton you fill in is yours, not
another table's.

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

### Step 3: fill in the eight blanks

The editor already has the **shape of the plan**: the `if` / `otherwise`, the order of the
calls, the loop line, START and END. What it does not have is **which function does each
job, and what each one is handed**. That is the whole of what you decide here, and it is
the 3.2.2 thinking the rest of the chapter runs on.

Eight lines of underscores are the blanks. Replace each one with the single line that
belongs there, top to bottom. (The wording below is Snack Shack's; your skeleton reads in
your problem's names — the blanks are in the same eight places.)

1. `set stock to ______` — where does the list come from, before anything uses it?
2. `set total to ______` — what gives you the total? Hand it the list.
3. `set low to ______` — what gives you the low-stock list? It needs the list **and** the
   level.
4. `set lines to ______` — what turns the list into one line per record?
5. the indented line under the loop — the loop is walking `lines`, so what happens **once
   per line**?
6. the line after the loop — which function changes one record? Hand it the list **and** a
   name (the reference plan sells `"Popcorn"`).
7. `report ______` — the record has changed. What do you report so the change shows?
8. the last line before `END` — what happens to the list when you are done?

Use the names you wrote in your contracts table. Everything from 2.2 and 3.1 still holds:
one instruction per line, and what sits inside something else is indented.

A line of underscores is a **placeholder, not a step**. A plan with one still in it is not
finished, and the check says so.

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

Open the **Flow Chart** above the editor and compare. It is a different problem's plan
with different function names — the shape is the same one in front of you, so use it to
see how a blank should read, not what to type.

The shape is given so that the blanks are the whole of what you decide together. If you
think the order is wrong, that belongs in your Part 3 reflection, not in the file.

### The part people get wrong

**Blank 6 is the one that matters.** The function that changes a record changes the list it
was handed. Your call has to give it the list **and** the name. A blank filled with a
function that only reads the list has not simulated a sale.

**Blank 7 is the proof.** Calling the function is not enough: a line after it has to report
or use the changed list, or the change is invisible.

**Blank 5 is inside the loop; blank 6 is not.** Once per line, then once after. That
indentation is the difference between walking the list and changing one record.

**Blanks 1 and 8 are the round trip.** The list comes back from storage before you use it,
and it goes back when you are done. One without the other is half of it.

**The name has to match the job.** `totalValue` does not sell anything and `receiptLines`
does not save. Each blank wants the function whose contract does that work.

### Before you submit

**Try as many times as you like.** Each partner submits their own: submit, read the
feedback on which parts of the plan are not doing their job, fill the gaps again, submit
again. Your best try counts. A line of underscores left in is an empty answer, not a plan
that avoids the subject.

Exact wording does not matter, and neither does spelling. Before you call it done, walk
one record through your plan out loud — and then walk the *list*, because the loop is
where this chapter's programs stop being straight lines. Part 2 will open your saved
plan beside your code, so write something you will want to read again.
