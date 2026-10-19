**Goal:** See that a `break` inside a nested loop stops only the loop it's *directly* inside, not both.

## Step 1: Predict, then run

Before you run this, guess: does `break` stop just the inner loop, or the whole thing?

```js live plain
for (let i = 1; i <= 3; i++) {
  for (let j = 1; j <= 3; j++) {
    if (j === 2) {
      break;
    }
    console.log("i=" + i + " j=" + j);
  }
}

console.log("Done.");
```

**What you should see:**
```
i=1 j=1
i=2 j=1
i=3 j=1
Done.
```

The inner loop breaks at `j === 2` every single time, but the outer loop is untouched. It starts a fresh inner loop for the next `i`, and that fresh inner loop breaks at `j === 2` again.

## Step 2: Say the rule out loud

`break` ends the loop it is **directly** inside. Here, `break` sits inside the `j` loop's body, so it ends the `j` loop. The `i` loop is a different loop entirely: `break` never touches it.

```flow readonly caption="Figure 2.4.27: the nested loops. When j is 2 the break arrow leaves only the inner loop and lands on the step that adds 1 to i. The outer loop carries on with its next round."
flowchart TD
  A([Start]) --> B[i starts at 1]
  B --> C{i is 3 or less}
  C -- no --> L[/log Done/]
  L --> M([End])
  C -- yes --> D[j starts at 1]
  D --> E{j is 3 or less}
  E -- no --> K[add 1 to i]
  K --> C
  E -- yes --> F{j is 2}
  F -- yes --> K
  F -- no --> G[/log i and j/]
  G --> H[add 1 to j]
  H --> E
```


## Key takeaways

- `break` in a nested loop only leaves the loop it's written inside: one level, not all of them.
- The outer loop keeps running and starts a brand-new inner loop on its next round.
- This surprises people who expect `break` to mean "stop everything." It means "stop *this* loop."
