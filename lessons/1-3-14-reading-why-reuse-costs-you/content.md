## A tiny saving, and a real bill

Reusing a variable saves a small amount of typing and costs a large amount of debugging. That trade is the whole argument, and it is worth spelling out because the saving is visible immediately and the cost arrives later.

When you reuse a variable, you have to **keep track of what it holds at every point in the program.** Not once — continuously, in your head, while reading. Miss one reassignment and you have made a wrong assumption about what a line does, which is the exact shape of a bug that takes an hour to find.

With one variable per purpose, that tracking disappears. `playerName` holds a player's name. It held one on line 4 and it holds one on line 90.

### The performance myth

The usual defence of reuse is "extra variables must be slower, right?" No.

Modern JavaScript engines and build tools optimise code so thoroughly that using extra variables does not hurt performance in any way you could measure. If anything, separate variables for separate values can help the engine run your code *faster*, because a variable whose type never changes is easier for the engine to optimise. A variable that holds a number, then text, then a boolean is the harder case for the machine as well as for you.

So there is no trade-off to weigh here. Clear naming is not something you pay for in speed. **True or false: using extra variables slows down your program?** False — and now you know why, which matters more than the answer.

**What you'll learn from it:**
- Reuse forces you to track a variable's meaning line by line while reading.
- That tracking is where the bugs come from.
- Extra variables do not slow your program down — the myth is just a myth.
- A variable whose type never changes is easier for the engine to optimise.

**Try it:**

Read this and predict the final output *before* running it.

```js live plain
let value = 10;
value = value * 2;

let label = "total";
value = label;          // reused for something completely different

value = value + 5;

console.log(value);
```

`total5`. The `+` joined two pieces of text instead of adding numbers, because by that line `value` was a string — and you had to read every line above to know that. Give the second use its own variable and the surprise cannot happen.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **debugging cost** | The time spent finding a bug, which reuse reliably increases |
| **tracking** | Holding a variable's current meaning in your head while reading |
| **optimisation** | Work the engine does to run your code faster |
| **premature optimisation** | Making code worse to chase a speed gain that is not real |
