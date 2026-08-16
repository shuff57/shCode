## Knowing the answer in advance

**Testing** and **debugging** are the techniques used to find flaws in algorithms and defects in code so they can be corrected. They are not the same thing:

- **Testing** finds out *that* something is wrong.
- **Debugging** finds out *why*, and fixes it.

A **test case** is specific input data used to check whether a program functions correctly and meets its requirements. The important part: **you have to identify the test cases before you can run any tests**, and identifying one means deciding what the right answer is in advance.

That is the whole mechanism. A program produces an answer; a test case supplies an answer you already trust; a test is the comparison. Without the second thing, there is nothing to compare against and "it looks right" is all you have.

### Testing the sandwich

In the jam sandwich algorithm, testing works by taking turns. One person plays the programmer who wrote the instructions; the other plays the robot. The programmer reads out each instruction and the robot follows it **exactly**.

Each instruction is a test case, and the test succeeds if the robot can carry it out precisely and successfully. Otherwise you debug the instruction — find the source of the problem and correct it.

A record sheet helps, and the columns are worth knowing because they are the same ones a professional bug report has:

| Test case | Input | Expected outcome | Observed outcome | Improvement |
|---|---|---|---|---|
| 1 | | | | |

**Expected** before **observed**. In that order, always — writing the expectation after seeing the result is how you talk yourself into accepting a wrong answer.

Everyone makes mistakes programming; they are part of learning. There is a good case that the deepest learning happens exactly when something goes wrong.

**What you'll learn from it:**
- Testing finds *that* something is wrong; debugging finds *why*.
- A test case is input plus the answer you already know is right.
- You identify test cases before running anything.
- Write the expected outcome down before you look at the observed one.

**Try it:**

Three test cases, run by hand. Each prints PASS or FAIL by comparing what happened to what should have happened.

```js live plain
let width = 4;
let height = 5;
let area = width * height;

// test case 1: 4 by 5 should be 20
if (area === 20) {
  console.log("PASS  4x5 = " + area);
} else {
  console.log("FAIL  4x5 gave " + area + ", expected 20");
}

// test case 2: a square, 3 by 3, should be 9
width = 3;
height = 3;
area = width * height;
if (area === 9) {
  console.log("PASS  3x3 = " + area);
} else {
  console.log("FAIL  3x3 gave " + area + ", expected 9");
}
```

Change `*` to `+` on the third line and run it again. Both tests fail, and each one tells you the expected value and the observed one — which is a far more useful report than a program that simply prints a number.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **testing** | Checking whether a program meets its requirements |
| **test case** | Specific input, plus the outcome you expect from it |
| **expected outcome** | What should happen — written down before you run |
| **observed outcome** | What actually happened |
| **debugging** | Finding and fixing the cause of a failed test |
