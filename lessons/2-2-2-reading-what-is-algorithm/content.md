## What Is an Algorithm?

**What you'll learn:**
- What the word "algorithm" means in plain English
- Why an algorithm must be precise and ordered
- How an everyday algorithm maps to JavaScript `if` statements

An **algorithm** is a precise, ordered set of steps to accomplish a task. Precise means every step is specific enough that someone (or a computer) can carry it out without guessing. Ordered means the steps happen in a defined sequence — change the order and you may get the wrong answer or no answer at all.

You already write algorithms whenever you write code. The trick is learning to think through the steps *before* you type any syntax.

**Example:** Finding the largest of three numbers is a classic tiny algorithm.

1. Start by assuming the first number is the largest.
2. Compare it to the second number. If the second is larger, update your "current largest."
3. Compare the current largest to the third number. If the third is larger, update again.
4. Whatever is in "current largest" at the end is the answer.

Those four plain-English steps map almost one-to-one to the code below.

**Try it:** Read through the code and match each `if` to one of the four steps above. Then run it and change the three starting numbers to confirm it always finds the right answer.

```js live plain
let a = 14;
let b = 27;
let c = 9;

let largest = a;

if (b > largest) {
  largest = b;
}

if (c > largest) {
  largest = c;
}

console.log("The largest number is: " + largest);
```

Notice that the code is almost a direct translation of the English steps. That is not a coincidence — good algorithms make the code almost write itself.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **algorithm** | A precise, ordered set of steps to solve a problem |
| **precise** | Every step is specific enough to carry out without guessing |
| **ordered** | Steps happen in a defined sequence; order matters |
| **pseudocode** | Algorithm steps written in plain English before you write real code |
| **edge case** | An unusual input (like all three numbers being equal) worth testing |
