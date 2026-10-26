# Reference answer — Part 4: Plan It

Pseudocode plan for Step Counter. A student who picked Battery Life or Tip Calculator
instead is marked against THAT problem — see lesson.json → aiGrader.prompt. This is one
acceptable shape, not the only one: different keywords and phrasing score the same as long
as a loop with a real body builds the answer, the right value is worked out and compared
with the problem's own limit, and all three outcomes are separated and reported.

```
START
INPUT stepsGoal
SET stepsSoFar TO 0
FOR d = 1 TO 7
    INPUT the steps for day d
    SET stepsSoFar TO stepsSoFar + the steps for day d
END FOR
SET remaining TO stepsGoal - stepsSoFar
SWITCH
    CASE remaining < 0
        PRINT "goal exceeded"
    CASE remaining == 0
        PRINT "goal met"
    CASE remaining > 0
        PRINT "not yet reached"
END SWITCH
END
```
