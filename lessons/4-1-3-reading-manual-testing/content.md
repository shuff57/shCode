## Manual Testing: PASS / FAIL Checks

**What you'll learn:**
- What a manual test is and why it matters
- How to compare an actual result to an expected result with `if`
- How to print "PASS" or "FAIL" so bugs are obvious at a glance
- How to test more than one case for the same function

When you write a function, how do you know it works? You test it. A **manual test** calls the function with a value you already know the answer for, then checks whether the output matches. If it does — PASS. If it doesn't — FAIL and you go fix the function.

**Try it:** Run the block as-is first, then try breaking `double` on purpose (e.g., change `n * 2` to `n + 2`) and re-run to see the FAIL messages.

```js live plain
// The function we want to test
function double(n) {
  return n * 2;
}

// Test 1: double(3) should return 6
var actual1 = double(3);
var expected1 = 6;
if (actual1 === expected1) {
  console.log("Test 1: PASS");
} else {
  console.log("Test 1: FAIL — got " + actual1 + ", expected " + expected1);
}

// Test 2: double(0) should return 0
var actual2 = double(0);
var expected2 = 0;
if (actual2 === expected2) {
  console.log("Test 2: PASS");
} else {
  console.log("Test 2: FAIL — got " + actual2 + ", expected " + expected2);
}
```

Each test follows the same pattern: call the function, store the result in `actual`, state what you `expected`, compare with `===`, print PASS or FAIL. You can copy that pattern for every function you write.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **manual test** | A check you write yourself: call a function and compare the result to what you know it should be |
| **actual** | The value the function actually returned |
| **expected** | The value you predicted the function should return |
| **PASS** | Actual matches expected — the function is working for this input |
| **FAIL** | Actual does not match expected — there is a bug to fix |
| **test case** | One specific input + expected output pair used to check a function |
