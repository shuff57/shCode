## Most bugs are silent

> **Definition 1.5.9: Debugging.** The process of finding and fixing the cause of incorrect behaviour in a program. Its basic technique is to **compare what you believe the program is doing with what it is actually doing.**

The important word in that definition is *compare*. Debugging is not staring at code until inspiration strikes. It is a procedure with two inputs, and you have to supply both.

**Most bugs are not crashes.** The program runs happily and produces the wrong answer, and there is no message at all: nothing is broken as far as JavaScript is concerned. 1.5.38's error messages only help with the loud minority.

For the silent majority, the basic tool is `console.log`. The technique is to **print what you believe is true and check whether it is.**

### Two habits

**Label every print.** `console.log(total)` gives you a bare number with no clue which line it came from. `console.log("total is " + total)` tells you. Once you have six prints, unlabelled ones are useless.

**Print more than you think you need.** The mistake is rarely where you expect: which is precisely why it is still a mistake. If you knew where it was, it would be fixed.

Browsers offer more powerful tools, including a debugger that pauses a program mid-run and lets you inspect it line by line. `console.log` remains the one every programmer uses most, because it takes three seconds and answers the question most of the time.

**What you'll learn from it:**
- Debugging is comparing what you believe against what actually happens.
- Most bugs produce no error message at all.
- Label every print, or you will not know which is which.
- Print more than you think you need: the bug is not where you expect.

**Try it:**

This program does not fail. It is wrong.

```js live plain
let price = 20;
let quantity = 3;
let total = price + quantity;

console.log("price is " + price);
console.log("quantity is " + quantity);
console.log("total is " + total);
```

`23`. No error, no warning, and a total of `23` for three items at 20 each is nonsense. The `+` should be a `*`.

Nothing but printing the values would have shown you that. And notice which prints did the work: the first two showed **correct** values, which is what left only one place for the mistake to be. Ruling things out is not wasted effort; it is the method.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **debugging** | Comparing what you believe a program does with what it actually does |
| **silent bug** | Wrong output, no error message |
| **labelled print** | `console.log("total is " + total)`: says which value it is |
| **debugger** | A tool that pauses a program mid-run for inspection |
| **ruling out** | Confirming the parts that are correct, to narrow where the bug can be |
