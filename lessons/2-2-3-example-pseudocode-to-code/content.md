**Goal:** Turn a plain-English algorithm into working JavaScript by writing the pseudocode as comments first, then filling in the code underneath.

## Step 1 — Read the pseudocode

Here is the algorithm in plain English, written as comments. Read through it before touching any code. Notice how each step maps naturally to a JavaScript statement.

```js live console
// Algorithm: find the largest of three numbers a, b, c
// 1. Start by assuming a is the largest.
// 2. If b is larger than our current largest, update largest to b.
// 3. If c is larger than our current largest, update largest to c.
// 4. Print the largest.

let a = 14;
let b = 27;
let c = 9;
```

## Step 2 — Fill in the code under each comment

Each comment becomes one or two lines of JavaScript. Run it and check that it prints `27`.

```js live console
let a = 14;
let b = 27;
let c = 9;

// 1. Start by assuming a is the largest.
let largest = a;

// 2. If b is larger than our current largest, update it.
if (b > largest) {
  largest = b;
}

// 3. If c is larger than our current largest, update it.
if (c > largest) {
  largest = c;
}

// 4. Print the largest.
console.log("Largest:", largest);
```

## Step 3 — Try different values

Change `a`, `b`, `c` to `5`, `5`, `5` (a tie) and then to `99`, `1`, `2`. The algorithm handles both cases without any changes.

```js live console
let a = 99;
let b = 1;
let c = 2;

let largest = a;

if (b > largest) {
  largest = b;
}

if (c > largest) {
  largest = c;
}

console.log("Largest:", largest);
```

## Key takeaways

- Write the algorithm in plain English as comments **before** writing any code.
- Translate one comment at a time — each step is usually one or two lines.
- Separate `if` statements (not `else if`) let every condition get checked independently, which is right here because each check might update `largest`.
- Testing edge cases (tie, first is largest, last is largest) confirms the algorithm is correct.
