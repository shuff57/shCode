**Goal:** Use a nested loop to build a multiplication table, one row at a time.

## Step 1 — Run it and read the shape

```js live plain
for (let a = 1; a <= 4; a++) {
  let line = "";
  for (let b = 1; b <= 4; b++) {
    line = line + (a * b) + "\t";
  }
  console.log(line);
}
```

`\t` is a tab character — it lines the columns up in the output.

## Step 2 — Trace what happens on one outer round

Pick `a = 3`. `line` starts as an empty string. The inner loop runs `b` from 1 to 4, appending `3*1`, `3*2`, `3*3`, `3*4` to `line` one at a time. Only after the inner loop finishes all four does `console.log(line)` run and print the whole row at once.

## Step 3 — Move `let line = ""` and see it break

`line` has to be declared **inside** the outer loop, before the inner loop starts, so it resets to empty at the start of every row. Move it above the outer loop instead and run this:

```js live plain
let line = "";   // moved outside — now it never resets

for (let a = 1; a <= 4; a++) {
  for (let b = 1; b <= 4; b++) {
    line = line + (a * b) + "\t";
  }
  console.log(line);
}
```

Every row now includes every number from every previous row too — `line` never went back to empty.

## Key takeaways

- The inner loop builds one row as a string; the outer loop prints it and starts the next.
- A variable that needs to reset every outer round has to be declared **inside** the outer loop, above the inner one.
- `line = line + (a * b) + "\t"` is the accumulator pattern from section 2.2, just building a string instead of a number.
