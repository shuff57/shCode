## Write Up What You Built

**What you'll practise:**
- Writing down a program you already wrote, not one you are planning
- Calling a function in one step instead of writing out its inside
- Seeing the main program get *shorter* once the decisions moved inside the functions

3.1.12 had you plan the grade advisor **before** the refactor. This is the other half: write it down **after**, from the code you wrote in 3.1.13.

### The main program is shorter now, and that is the point

Before the refactor the program needed a decision for the score chain and another for the attendance check. Now that `decideGrade()` and `printAdvice()` exist, the *main* program does not branch at all. It runs three things in order: set up the three values, call `decideGrade()`, call `printAdvice()`.

So your write-up has **no IF or ELSE line**. If you reach for one, you are writing what is inside `decideGrade()` or `printAdvice()`: stop, and collapse it back into a call.

### Check it against the code

Hold this next to your 3.1.13 script. Every function the code calls should be a CALL line here, and the other way round: the same one-to-one rule 3.1.12 asked for, now checked from the other side.

The Flow Chart bar above the editor shows the same shape for a different program. It is read-only.
