**Goal:** Take a reused variable apart and see precisely where the confusion enters, so you can spot the pattern in your own code rather than only in an example.

## Step 1 — The code

```js live plain
let x = 100;
console.log(x);
x = "Alice";
console.log(x);
x = true;
console.log(x);
```

It runs. It prints `100`, `Alice`, `true`. Nothing is broken.

## Step 2 — Ask what `x` is

That is the whole problem, and it shows up the moment somebody asks the question.

| Line | What `x` holds | What `x` *means* |
|---|---|---|
| 1 | `100` | a maximum score, apparently |
| 3 | `"Alice"` | a player's name |
| 5 | `true` | whether the game has ended |

Three unrelated ideas, one label. By the third `console.log` there is no way to know what `x` is *supposed* to represent — you can only know what it currently contains, and only by reading every line above it.

Now imagine those three assignments are 40 lines apart, with other code between them. That is the realistic version, and it is why this is a habit worth breaking on six-line programs.

## Step 3 — Split it

```js live plain
let maxScore = 100;
console.log(maxScore);

let playerName = "Alice";
console.log(playerName);

let isGameOver = true;
console.log(isGameOver);
```

Same output. Three variables instead of one, and each has a single clear purpose that its name announces.

Notice you can now read any one of those lines on its own and understand it completely. That is the property the first version destroyed — not correctness, *local readability*.

## Step 4 — The version that is fine

Reassignment itself is not the problem. This is fine:

```js live plain
let score = 0;
console.log(score);

score = score + 10;    // same purpose, new value
console.log(score);

score = score * 2;
console.log(score);
```

`score` changes three times and means the same thing throughout. The name never becomes a lie. **That** is the test — not "does this variable change?" but "does what it *means* change?"

## Key takeaways

- Reused variables run correctly; they fail a reader, not a computer.
- The test question is "what is this variable *for*?", asked at each line.
- Splitting restores local readability — any line can be understood alone.
- Reassigning for the same purpose (`score = score + 10`) is perfectly fine.
