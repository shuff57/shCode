## Chapter 3 Group PA — Part 1 of 3: Find and Fix the Plan

**This is the assessment for the whole chapter, and you are doing it in pairs.** Three
thirds: plan, build, reflect. This is the planning third, it is worth **25%**, and it comes
first. Neither of you opens an editor for Part 2 until this plan is done.

A plan for your problem is already written in the editor. **Four lines in it are wrong.**
Your job is to find each one and repair it — not to write the plan again. That is a harder
skill than it looks: before long you will be reading your partner's plan and your own code,
and the question is always *what is this line actually doing?*

**What you'll be assessed on here:**
- Reading a call and saying what it takes in and what it gives back (3.2.2)
- Spotting a line that cannot do the job it is sitting in — the wrong function, a call
  missing something it needs, a step in the wrong place
- Repairing the two lines the lesson calls the point of the plan: the change to one
  record, and the report that shows it

### Step 1: pick one problem

Four problems. Pick **one**. They are built to the same measure: a list of records with
the same three fields (a name, a count, and one more number), and the same five jobs plus
save and load: build one record, total the list, select a subset, turn the list into one
line per record, change one record in place. Each total multiplies
the count by the other number; each subset test is one comparison; each change lowers a
count by one and never below zero. Check with the pair next to you first: two adjacent
tables should not build the same one.

**Then say which one you picked in the box labelled "Your problem" above the editor.** That
loads the plan written for that problem — the same shape, with the same four mistakes, in
that problem's names — so you are repairing your own table's plan, not another's.

---

**1. Snack Shack**

Your stock is an array of items, each `{ name, price, qty }`. The plan uses:

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

You are logging a meet. Each runner is `{ name, laps, lapSeconds }`. The plan uses:

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

You are keeping a drawer of seed packets. Each variety is `{ variety, packets, seedsPerPacket }`. The plan uses:

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

A cart of titles, each `{ title, copies, pages }`. The plan uses:

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

Before you touch the plan. One row per function, both of you, out loud: **what it takes in
and what it gives back**. This is 3.2.2 made to do work — a function's signature *is* its
contract — and it is how you tell a call that can do a job from a call that cannot. A call
handed too little cannot do its job, and the contract is what says so. (The table is for
Snack Shack; use the names in your own problem's plan if you picked another.)

| Function | Takes in | Gives back |
|---|---|---|
| makeItem | | |
| totalValue | | |
| lowStock | | |
| receiptLines | | |
| sellItem | | |
| saveStock / loadStock | | |

### Step 3: find the four mistakes

The plan in the editor is complete: START and END, the order of the steps, the
`if` / `otherwise`, the loop line. **Do not rewrite it.** Four lines are wrong, and each is
wrong in one of these ways:

- one line **calls the wrong function for its job** — the name on the line does not match
  what that step is for;
- **two calls are not handed everything they need** — a function that takes two things is
  given one;
- one step is **in the wrong place** — it happens before the thing it is supposed to show.

The **Quest panel** above the editor is the checklist: one card per job the plan has to do,
and a red card is a job the plan is not doing right now. It tells you *which job* is wrong;
it does not tell you which line or what to type. That is the finding part.

Work through the plan top to bottom. For each line, ask the contract question: **does this
function do this job, and does it have what it needs?**

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

Open the **Flow Chart** above the editor and compare. It is a different problem's plan with
different function names, so use it to check the *order* of the steps and what each call is
handed — not the words.

### The part people get wrong

**The change and its report are the point.** The function that changes a record changes
the list it was handed, so its call has to give it the list **and** the name. Handed only
the list, it cannot know which record to change.

**A change nobody can see has not been shown.** A line after the change has to report or use
the changed list. A report written *before* the change is reporting the old state — that is
one of the four mistakes.

**The load comes before the list is used; the save comes after the change.** A save before
the change loses it, and a load after the first use is not a load. The line that says it
loads the list and calls the *save* function is the wrong-way-round mistake, and the Quest
panel will keep saying so until it is repaired.

**The name on the line has to match the job.** `totalValue` does not sell anything and
`receiptLines` does not save. Read the call, not the sentence around it.

### Before you submit

**Try as many times as you like.** Each partner submits their own: submit, read the
feedback on which jobs the plan is not doing, repair the lines, submit again. Your best try
counts.

Exact wording does not matter, and neither does spelling. The lines that were already right
are not your work to redo — keep them right as you repair the four. Before you call it done,
walk one record through the plan out loud, then walk the *list*, and check that every call
is handed what its contract says it needs. Part 2 will open your saved plan beside your
code, so leave a plan you will want to read again.
