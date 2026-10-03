## Chapter 2 Individual PA — Part 3 of 5: Find and Fix

**This is the debugging part of the test, and you are doing it alone.** One file,
four bugs in it, **20 points**, about **11 minutes**.

**This part is summative:** one sitting, no score shown. Nothing in the browser turns
green on this part, so run the program yourself to check each fix. Your teacher marks it afterwards.

---

### What to do

1. **Press Run first**, before you change anything.
2. **Fix one bug at a time**, and press **Run** after every fix.
3. **Above each fix, write a comment saying what kind of bug it was.**

---

### The three kinds

| Kind | What it means |
|---|---|
| **syntax** | The file is not valid JavaScript, so the whole thing refuses to start. |
| **runtime** | It is valid, it starts, and then it stops with an error. |
| **logic** | It runs all the way through and prints something untrue. |

The kind is about **when** it goes wrong, not about how hard it was to find.

---

### The four bugs

The file marks them **Bug 1** through **Bug 4**. Each one has a comment beside it
saying what that part of the program is *meant* to do — find the place where the
code stops doing that.

1. **Bug 1 — nothing runs at all.** The console names the line it gave up on.
2. **Bug 2 — it stops part way through.** A name is used that was never declared.
3. **Bug 3 — the receipt says `Savings: 30`.** It should say `Savings: 40`.
4. **Bug 4 — the receipt prints, then the console goes quiet.** The walking log never
   prints a single line, and the run is stopped after 10 seconds.

---

### What "finished" looks like

When all four are fixed the program prints exactly this, top to bottom, and then
stops:

```
Week 1: deposit of 10
Week 2: deposit of 10
Week 4: deposit of 10
Item: Notebook
Ordered: 6
Before tax: 30.5
Savings: 40
Total: 32.94
Week 1
Week 3
Week 5
```

---

### Before you submit

- **Run it.** That output is the one to aim for.
- Four fixes, four comments: **syntax**, **runtime**, **logic**, in the words above.
- Your teacher marks the fix in the code, so naming the bug is part of the fix, not an
  afterthought.
