**Goal:** Turn the action "debug the loop" into a task set: a checklist where every task produces a work product you can check before moving on.

## Step 1: Reproduce the bug

Before touching anything, run the code and see the failure yourself. Reproducing a bug confirms it is real and gives you a starting point. Each task in a task set produces a work product that gets checked: here the check is "I can trigger the bug."

```js live plain
// A loop that prints 1..5 but skips 3.
for (let i = 1; i <= 5; i++) {
  if (i === 3) {
    continue;
  }
  console.log("count: " + i);
}
```

## Step 2: Inspect the condition

The work product for this step is *reading the loop carefully*. The check is that you can say what the loop condition and body actually do: the bug often lives right there.

```js live plain
console.log("The loop runs from 1 to 5.");
console.log("The `continue` skips 3. That is the bug.");
```

## Step 3: Trace by hand

Write out what the loop should print, one value per line, without running it. This step's work product is your trace: the check is that it matches what you *want* to happen.

```js live plain
console.log("Hand trace (expected):");
for (let i = 1; i <= 5; i++) {
  console.log("expected count: " + i);
}
```

## Step 4: Fix and retest

Apply the fix, then run the loop again to confirm it now prints every number. The final work product is the corrected, tested loop.

```js live plain
// Fixed: no `continue`, so every number prints.
for (let i = 1; i <= 5; i++) {
  console.log("count: " + i);
}
```

## Key takeaways

- A task set is the checklist one action needs: here, "debug the loop."
- Every task produces a real work product that gets checked before moving on.
- Debugging order matters: reproduce, inspect, trace, fix, then retest.

## Short glossary (quick reference)

| Term | Definition |
|---|---|
| task set (workflow) | All the tasks required to accomplish one software engineering action. |
