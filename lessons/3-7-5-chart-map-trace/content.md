## Plain English to Pseudocode: What `.map()` Does for You

**What you'll practise:**
- Turning plain English into exact, numbered steps
- Writing a loop out as `FOR EACH ... END FOR`
- Reading a flow chart and matching each box to a step

### The plan, in plain English

1. Start with an empty list called `withTax`.
2. Go through the prices one at a time.
3. For each price, multiply it by 1.08 and add the result to `withTax`.
4. When there are no more prices, print `withTax`.

`.map()` does the walking for you in real code, so the loop is invisible there. In pseudocode you write it out.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one.

| Write this | Use it for |
|---|---|
| `SET withTax TO an empty list` | a plain step that changes something |
| `FOR EACH price IN prices` ... `END FOR` | the loop, with the steps inside it indented |
| `ADD price * 1.08 TO withTax` | one step inside the loop |
| `OUTPUT withTax` | printing, once, after the loop |

### The line that catches people

The print goes **after** `END FOR`. If you put it inside the loop, the program prints a growing list on every pass. And the adding step goes **inside** the loop, so there is one entry per price: that is why `withTax` always ends up the same length as `prices`.

### Before you submit

Check that all six requirements are green, then: Trace it by hand with the real array `10, 20, 30`. Follow your own steps and count the passes through the loop. If you do not end with **three** results in `withTax`, the steps are wrong somewhere even if every check is green.
