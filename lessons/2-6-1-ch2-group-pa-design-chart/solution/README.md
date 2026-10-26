# Reference answer — Part 1: Design the Plan

Pseudocode plan for Locker Sweep. A student who picked Word Audit, Savings Run or Coin
Drawer instead is marked against THAT problem — see lesson.json → aiGrader.prompt. This is
one acceptable shape, not the only one: different keywords and phrasing score the same as
long as a loop walks the problem's input with its work indented under it, the skip or stop
the problem forces sits under its condition, the outcomes are classified and reported after
the loop, and the bad input is guarded near the start.

```
Problem: Locker Sweep
Partners: A and B
Text for the program: Hallway B

INPUTS
- n, the number of lockers
- bankName, the name of the locker bank

PLAN
START
INPUT n
INPUT bankName
IF n < 1
    THROW "n must be at least 1"
END IF
SET openCount TO 0
FOR i = 1 TO n
    IF i is a multiple of 3
        CONTINUE
    END IF
    FLIP the state of locker i
    IF locker i is now open
        SET openCount TO openCount + 1
    ELSE
        SET openCount TO openCount - 1
    END IF
END FOR
SWITCH the state of locker 7
    CASE open
        SET verdict TO "open"
    CASE closed
        SET verdict TO "closed"
    CASE never touched
        SET verdict TO "never touched"
END SWITCH
PRINT bankName
PRINT verdict
PRINT openCount
END
```
