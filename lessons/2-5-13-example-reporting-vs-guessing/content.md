**Goal:** Compare a catch that says nothing useful with one that reports, and see how much more one of them tells you.

## Step 1 — The unhelpful version

`config` was never declared. This catch survives the error, but doesn't say anything about it.

```js live plain
try {
  console.log(config);
} catch (err) {
  console.log("Error!");
}
```

`"Error!"` is true, but useless. It doesn't say what failed or why.

## Step 2 — The useful version

Same failure, but the catch reports `err.message` this time.

```js live plain
try {
  console.log(config);
} catch (err) {
  console.log("Could not read the setting: " + err.message);
}
```

Now the output names the exact variable JavaScript couldn't find: `config is not defined`. If this were a real bug, you'd know exactly where to look.

## Key takeaways

- Both programs survive the error — only one of them tells you what to fix.
- `err.message` already did the work of describing the problem. Printing it costs nothing.
- "It didn't crash" and "it told me what happened" are two different levels of handling an error — aim for the second.
