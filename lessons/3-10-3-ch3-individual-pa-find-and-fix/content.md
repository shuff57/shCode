## Chapter 3 Individual PA — Part 3 of 5: Find and Fix

**This is the debugging part of the test, and you are doing it alone.** One file, four
bugs in it, **20 points total**, about **11 minutes**. You run the program, read what
happens, find each bug, name its type (syntax / runtime / logic), and fix it.

**This part is summative:** one sitting, no marking shown, no explanations shown, score
not shown. The checklist tells you which symptom remains — never what to type. The
teacher reviews your submission afterwards.

---

**The program prints a price list report for a small store.** It has four bugs. One
stops the program before it starts. One stops it part way through. One lets it run and
print something untrue. One changes data it was never supposed to touch.

**Fix all four. Above each fix, write a comment naming the kind it was: syntax, runtime,
or logic.** A syntax bug means the file is not valid JavaScript. A runtime bug means the
file is valid, starts running, and then stops. A logic bug means it runs all the way
through and tells you something untrue.

---

### The four bugs, in the order the checklist looks for them

1. **The program does not run at all.** The console names the line it gave up on.
2. **The program stops part way through.** The report never gets as far as the last
   item.
3. **The receipt lines are wrong.** Three items, and the receipt should have three
   lines — work out on paper what they should say, then compare.
4. **The backup changes the original.** The report says the original item was sold down,
   and nothing in the program meant to touch the original at all.

The checklist names the symptom, never the repair. The diagnosis is yours — that is the
skill the part exists to assess.

---

### Before you submit

- **Run it.** Every fix you make should be checked by running, and Part C is the one
  part of this paper where running is allowed.
- Four fixes, four comments: **syntax**, **runtime**, **logic**, in the words above.
- The checklist goes green only when the checker can see the fix in the code — naming
  the bug is part of the fix, not an afterthought.