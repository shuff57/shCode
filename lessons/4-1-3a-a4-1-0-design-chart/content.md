## Q1 Synthesis Design Plan

Plan the **whole program** before writing any of it. **No JavaScript is written today.** The build lessons stay closed until this plan is green.

From the project checklist, your program has to:

- store at least five objects of your own design in an array
- write a function of your own with at least 3 parameters
- write a function of your own that returns a computed value, used elsewhere in the program
- sort the array
- read the array with a loop
- make a decision with a conditional based on your data
- save and load your data
- print one formatted verdict line combining at least two things you calculated

In `README.md`, write the **main program** as numbered pseudocode **between START and END**: the sequence that runs when the page loads. Number every line, including the indented ones and the END lines. Each keyword looks like this:

- `CALL loadQueue` (one line for each function you plan to write)
- `IF there is a saved queue` ... `ELSE` ... `END IF` (a decision, with both ways out)
- `FOR EACH order IN queue` ... `END FOR` (walking your array)
- `OUTPUT the verdict line` (the printed result)

Three rules make it a design. **One CALL per planned function, both directions**: every function you intend to write is on the plan, and every CALL becomes a real function. **Stay under twenty steps**: if you cannot, collapse a run of steps into a function and name it. **Do not write the function bodies**: only the main program.

When you hand in the finished project, the plan comes with it and one thing is compared: does the code match the plan? You may change your mind. What is not allowed is silently abandoning the plan: update it and say in your README what changed and why.
