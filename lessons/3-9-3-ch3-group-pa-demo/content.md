## Chapter 3 Group PA — Part 3 of 3: Reflect

**A short write-up, done together.** The plan and the build are finished; this is where you say what
happened. It is worth **25%**, and short answers are fine.

**You get three tries.** Each partner submits their own: grade, read the feedback on each item,
improve and grade again. Your best try counts. After your third try you can see how it is solved,
once your teacher releases it.

### 1. Who did what

Name both partners. Say who drove the keyboard for the plan (3.9.1), who drove it for the code
(3.9.2), and one thing the partner who was not typing caught.

### 2. Three test cases

A test case is one run of your program where you **know the right answer before you run it**.
Write three, in a table with these columns:

| What you put in | What you expected | What you got |
| --- | --- | --- |
| the items or numbers you gave it | the answer you worked out by hand first | what your program printed |

Your program makes one yes-or-no decision: the **subset function** (`lowStock`, `slowRunners`,
`lowPackets` or `longTitles`) keeps an item or leaves it out. A good set of tests checks **both**
answers, so **at least one case must be kept and at least one must be left out**. Three cases that
all come out the same way prove only half of the decision.

| Your problem | Kept (counts) | Left out (does not count) |
| --- | --- | --- |
| Snack Shack, level 5 | Pretzel, qty 3: low stock | Popcorn, qty 12: not low |
| Lap Times, target 60 | a runner at 75 seconds a lap: slow | a runner at 55: not slow |
| Seed Tray, level 5 | a variety with 2 packets: low | a variety with 9: not low |
| Library Cart, limit 300 | a title of 420 pages: long | a title of 180: not long |

Then one line: **did "what you got" match "what you expected" every time?** If not, say what you
changed.

### 3. One thing you logged

Name one `console.log` you added to check your work, not to report the answer: what it printed,
what it showed you, and what you changed. If nothing was wrong, say what it confirmed.

### 4. Three sections in your code

Pick any **three** of the eight Chapter 3 sections. For each, name the function where it shows up
and quote one line of your own code from it.

| Section | What to look for |
| --- | --- |
| 3.1 | a function and its call |
| 3.2 | parameters and a return value |
| 3.3 | the loop over the array |
| 3.4 | the arrow function |
| 3.5 | a record object and its properties |
| 3.6 | the change the caller can see |
| 3.7 | `map()` |
| 3.8 | the save and the load |
