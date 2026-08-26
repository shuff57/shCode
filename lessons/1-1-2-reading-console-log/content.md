## Printing with console.log

**What you'll learn from it:**

- `console.log()` sends a value to the console output panel.
- You can print text (called a **string**), a number, or the result of a calculation.
- Putting text inside quotes: `"like this"`: tells JavaScript to treat it as text, not a command.
- Printing a number (no quotes) lets JavaScript do math and print the result.
- Printing a comparison like `5 > 3` prints `true` or `false`: these are called **booleans**.

**Try it:** Run the block below. Then change the text on line 1 to your own name and click Run again.

```js live plain
console.log("Hello, world!");
console.log(2 + 2);
console.log(10 > 5);
```

---

## Sequential execution (top to bottom)

**What you'll learn from it:**

- JavaScript runs each line in order, starting from the top.
- Line 1 finishes before line 2 starts; line 2 finishes before line 3 starts.
- The order of your lines matters: swapping two lines can change the output.
- This is called **sequential execution** and is true of almost every program you will ever write.

**Try it:** Read the three lines below and predict what order they will print. Then run the block and check.

```js live plain
console.log("Step 1: I run first.");
console.log("Step 2: I run second.");
console.log("Step 3: I run third.");
```

Try swapping lines 1 and 3 and run again. Notice the output order changes to match the new line order.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`console.log()`** | JavaScript statement that prints a value to the console output panel. |
| **String** | A text value written inside quotes: `"hello"` or `"42"`. |
| **Number** | A numeric value with no quotes: `42`, `3.14`. JavaScript can do math with it. |
| **Boolean** | A value that is either `true` or `false`. Comparisons like `5 > 3` produce booleans. |
| **Sequential execution** | Code runs one line at a time, top to bottom, in the order written. |
