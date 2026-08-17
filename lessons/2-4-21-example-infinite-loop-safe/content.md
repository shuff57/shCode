**Goal:** Add a guard counter to a loop you're not sure will terminate, as a debugging tool — not something to leave in finished code.

## Step 1 — A loop with a guard counter

`value` doubles each round until it reaches 100. `guard` counts the rounds, and if it ever passes 1000, that's a sign the loop isn't terminating on its own.

```js live plain
let value = 1;
let guard = 0;

while (value < 100) {
  value = value * 2;
  guard++;
  if (guard > 1000) {
    console.log("Guard tripped — this loop was not terminating.");
    break;
  }
}

console.log("Finished with value " + value + " after " + guard + " rounds.");
```

The guard never trips — `value` doubles fast enough that the loop finishes in 7 rounds. That tells you the loop was fine all along.

## Step 2 — Break the loop on purpose, see the guard catch it

Change `value = value * 2` to `value = value * 1`. Now `value` never grows, `value < 100` never becomes false, and without the guard this would hang the browser tab. Run it and watch the guard trip instead.

```js live plain
let value = 1;
let guard = 0;

while (value < 100) {
  value = value * 1;   // bug: this never changes value
  guard++;
  if (guard > 1000) {
    console.log("Guard tripped — this loop was not terminating.");
    break;
  }
}

console.log("Finished with value " + value + " after " + guard + " rounds.");
```

## Key takeaways

- A guard counter is `let guard = 0;` plus `guard++` inside the loop, plus a `break` once `guard` passes some large number.
- It's a **debugging tool**, not a fix — it stops the browser from hanging while you figure out the real bug.
- If the guard never trips, the loop was fine. If it trips, you've confirmed the loop isn't terminating and can go looking for one of the three causes from the last reading.
- Remove the guard once you've fixed the real bug — it doesn't belong in finished code.
