**Goal:** Wrap only the risky line in `try`, not the whole program, so a failure doesn't throw away work that had nothing to do with it.

## Step 1 — Run the whole thing

This program totals three sensor readings, then tries to log a sensor name that was never declared.

```js live plain
const readings = [12, 7, 19];
let total = 0;

for (let i = 0; i < readings.length; i++) {
  total = total + readings[i];
}

try {
  console.log(sensorName);
} catch (err) {
  console.log("No sensor name available, using a default.");
}

console.log("Total: " + total);
```

## Step 2 — Notice what's outside the try

The loop that totals `readings` sits **outside** the `try` block, on purpose. A loop over a list you already have cannot fail — there's no reason to risk it inside a `try`. Only the line that might actually go wrong (`console.log(sensorName)`) is wrapped.

## Step 3 — See what a too-wide try would cost

Now the loop is moved *inside* the `try` block, and it computes the total before the risky line runs.

```js live plain
const readings = [12, 7, 19];
let total = 0;

try {
  for (let i = 0; i < readings.length; i++) {
    total = total + readings[i];
  }
  console.log(sensorName);
  console.log("Total: " + total);
} catch (err) {
  console.log("Something went wrong.");
}
```

Run this version. `"Total: 38"` never prints — it was inside the block that got abandoned the moment `sensorName` failed, even though the total had already been fully computed.

## Key takeaways

- A `try` block abandons everything below the point where it fails, so wrap only the lines that can actually fail.
- Code that cannot fail — a loop over data you already have, printing a known value — does not belong inside `try`.
- The narrower the `try`, the less finished work you lose when something goes wrong.
