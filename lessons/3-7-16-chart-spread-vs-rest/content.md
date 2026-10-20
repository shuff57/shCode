## Plain English to Pseudocode: Spread vs. Rest, Side by Side

**What you'll practise:**
- Turning plain English into exact, numbered steps
- Writing a loop out as `FOR EACH ... END FOR`
- Reading a flow chart and matching each box to a step

### The plan, in plain English

1. Start the running total, `sum`, at 0.
2. Go through the numbers one at a time.
3. For each number, add it to `sum`.
4. When there are no more numbers, give back `sum`.

This is the **body of `total`**: the part that runs once the arguments have arrived. `total(5, 5)` and `total(...scores)` both end up here.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one.

| Write this | Use it for |
|---|---|
| `SET sum TO 0` | a plain step that changes something |
| `FOR EACH number IN numbers` ... `END FOR` | the loop, with the steps inside it indented |
| `SET sum TO sum + number` | one step inside the loop |
| `RETURN sum` | handing the answer back, once, after the loop |

### The point of the lesson

Your steps are the **same** whether the caller wrote `total(5, 5)` or `total(...scores)`. Spread at the call site changes only how the array reaches `numbers`; the gathering loop inside is identical either way. One is the doorway, the other is the room. And the `RETURN` goes **after** `END FOR`: a return inside the loop would hand back the answer after the first number.

### Before you submit

Check that all six requirements are green, then: Trace `total(1, 2, 3)` by hand. It should reach `RETURN` with `sum` equal to **6**. Follow your own steps and do the addition yourself. If you do not land on 6, fix the steps even if every check is green.
