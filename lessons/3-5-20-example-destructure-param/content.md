**Goal:** Move destructuring into a function's parameter list so the body reads with bare names and the parameter list documents what the function expects.

## Step 1: Reading an options object with dots

This is the options-object version from the previous lesson. It works, but `options.` is repeated on every line.

```js live plain
function describeBox(options) {
  return options.color + " box, " + options.width + "x" + options.height;
}

console.log(describeBox({ width: 10, height: 4, color: "red" }));
```

## Step 2: Unpack inside the body

Destructure on the first line of the body. The names are now local variables, so the return line has no `options.` prefix.

```js live plain
function describeBox(options) {
  const { width, height, color } = options;
  return color + " box, " + width + "x" + height;
}

console.log(describeBox({ width: 10, height: 4, color: "red" }));
```

## Step 3: Destructure in the parameter list

The pattern can sit directly where the parameter is named. The function is called exactly the same way; only how it reads its own argument changes.

```js live plain
function describeBox({ width, height, color }) {
  return color + " box, " + width + "x" + height;
}

console.log(describeBox({ width: 10, height: 4, color: "red" }));
```

## Key takeaways

- A destructuring pattern can be used wherever a variable is declared, including a parameter list.
- The parameter list now documents exactly which properties the function expects.
- The call site does not change at all; destructuring is a decision about the function's own code.
- The body reads with bare names, so it is shorter and easier to scan.
