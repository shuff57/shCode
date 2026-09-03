# Reference answer — Part 5: Write the Steps

Pseudocode for Backpack Check, matching the chart in Part 4's
solution/chart.mmd. A student who picked Screen Time or Print Job instead is
marked against THAT problem — see lesson.json → aiGrader.prompt. This is one
acceptable shape, not the only one: different variable names and phrasing
score the same as long as every input is fetched, the computation says how,
both branches of the comparison are written, and indentation carries them.

```
get the number of textbooks
get the weight of one textbook
get the student's own weight
set backpack weight to number of textbooks times weight of one textbook
set guideline to student's weight divided by 10
if backpack weight is at or under guideline
    report that the backpack is a safe weight
otherwise
    report that the backpack is over the guideline
```
