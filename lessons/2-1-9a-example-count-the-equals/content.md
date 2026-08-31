**Goal:** See what happens when a single `=` ends up inside an `if`, and why that bug never shows you an error.

You already know `===` from the last reading. There are three of these, not two, and the difference is easiest to keep straight if you read them aloud:

- `let score = 85` is "score **gets** 85."
- `score == 85` is "**is** score 85, once you convert?"
- `score === 85` is "**is** score 85, **and** a number?"

One stores. Two ask, ignoring type. Three ask, including type.

## Step 1: Predict, then run

Read this before you run it. `score` starts at 50, and the condition asks about 100. Do you expect anything to print?

```js live plain
let score = 50;

if (score = 100) {
  console.log("Perfect score!");
}

console.log(score);
```

## Step 2: What actually happened

It printed `Perfect score!` — and then `100`.

The condition never asked a question. `score = 100` **stored** 100 in `score`, and the value it handed back to the `if` was `100` itself, which is truthy (`2.1.12 Reading: Truthy and Falsy Values`). So the block ran.

Worse: the variable was changed on the way past. That is why the second `console.log` prints `100` and not `50`.

## Step 3: Prove it fires no matter what

Change the starting value and run it again. Try `7`. Try `0`. Try `999`.

```js live plain
let score = 0;

if (score = 100) {
  console.log("Perfect score!");
}

console.log(score);
```

The message appears every single time, because the condition was never a comparison at all.

## Step 4: The fix is one character

```js live plain
let score = 50;

if (score === 100) {
  console.log("Perfect score!");
}

console.log(score);
```

Now nothing prints but `50`. The comparison answered `false`, the block was skipped, and `score` was left alone.

## Key takeaways

- A single `=` inside an `if` is legal JavaScript. It does not crash, it does not warn, and it does not underline in red.
- It does two wrong things at once: the condition is always truthy (unless you assign a falsy value), and the variable gets overwritten.
- **When an `if` fires every time no matter what you put in the variable, count the equals signs first.**
- Prefer `===`. It is the one that cannot surprise you.
