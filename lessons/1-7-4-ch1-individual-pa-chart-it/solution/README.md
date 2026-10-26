# Reference answer — Part 4: Plan It

Pseudocode plan for Print Job. A student who picked Backpack Check or Screen Time instead
is marked against THAT problem — see lesson.json → aiGrader.prompt. This is one acceptable
shape, not the only one: different keywords and phrasing score the same as long as the plan
takes in what the problem names, has a line that says how the one value is worked out, asks
the comparison against the problem's own limit, and reports something different on each side.

```
START
INPUT number of pages
SET job cost TO number of pages * 0.08
IF job cost <= 5.00 THEN
    PRINT "The job can be printed"
ELSE
    PRINT "Not enough left in the account"
END IF
END
```
