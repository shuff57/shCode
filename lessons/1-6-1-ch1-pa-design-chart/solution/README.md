# Reference answer — Part 1: Design the Plan

Pseudocode plan for Slice Economics. A student who picked Split the Check, Grade Forecast
or Fuel Stop instead is marked against THAT problem — see lesson.json → aiGrader.prompt.
This is one acceptable shape, not the only one: different keywords and phrasing score the
same as long as the plan takes in what the problem names (including the one piece of text),
has a line that says how the value is worked out, asks the comparison against the problem's
own limit with the right outcome on each side, and reports something different on each side.

```
Problem: Slice Economics
Partners: Ana and Ben

PLAN
START
INPUT pizzeria name
INPUT pizza price
INPUT number of slices
SET cost per slice TO pizza price / number of slices
IF cost per slice <= 2.00 THEN
    PRINT pizzeria name and "is a good deal"
ELSE
    PRINT pizzeria name and "costs more than $2.00 a slice"
END IF
END
```
