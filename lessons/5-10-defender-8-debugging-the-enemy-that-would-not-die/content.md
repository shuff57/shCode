## The enemy that would not die

Something is wrong with this game, and it is not in the part you are looking at.

The editor holds the finished Part B game from 5.10.7, with **one line missing**. It runs, it never crashes, and most of the time it plays fine. A player sent in this report:

> "In wave 2 there was a red enemy with a 1 on it. It took three shots, and when I hit it the number went UP to 2. Then an orange 3 died in one shot. It doesn't happen every game."

**Why it hides.** A bug in parallel arrays rarely shows where it lives. The arrays only agree because every push and every splice happens to all three at the same index (5.10.1). Miss one splice and nothing breaks on that frame: one array is simply one item longer than the others, and from that index on, every enemy reads a neighbour's numbers. The wrong number shows up later, somewhere else, often in code that is perfectly correct. That is why "it doesn't happen every game": the drift needs the one piece of code that is wrong to run first.

**How to hunt it.** The lab's four steps follow the order every bug hunt does:

1. **Make it happen.** A bug you can repeat on purpose is half found. The steps say exactly how to play so it shows every time.
2. **Find it.** Ask which piece of code had to run before the bug appeared, then compare it with the code that does the same job and works.
3. **Fix it**, and run the same test again to prove it is gone.

**After the fix.** Step 4 moves the removal into one function, `removeEnemy(j)`, so the two places cannot disagree again. Notice what that does and does not buy: a function stops the copying; it does not stop a fourth array from needing a fourth splice.
