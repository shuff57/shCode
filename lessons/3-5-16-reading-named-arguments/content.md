## The Problem With Positional Arguments

**What you'll learn:**
- Why a long list of positional arguments is hard to read
- How a swap between two same-typed values goes unnoticed

Arguments match parameters by position. A function taking `(width, height, depth, color)` will happily accept the numbers in the wrong order — all four are valid values, so nothing errors and the output is quietly wrong.

**Try it:** Read the call, then say out loud which number is the height.

```js live plain
function describeBoxPositional(width, height, depth, color) {
  return color + " box, " + width + "x" + height + "x" + depth;
}

console.log(describeBoxPositional(10, 4, 6, "red"));
```

## One Object of Named Options

**What you'll learn:**
- How passing a single object carries each name to the call site
- Why the object's keys, not their order, decide what goes where

Pass a single object instead, and every value carries its name to the call site.

**Try it:** Call the same function twice with the keys in different orders and compare.

```js live plain
function describeBox(options) {
  return options.color + " box, " +
    options.width + "x" + options.height + "x" + options.depth;
}

console.log(describeBox({ width: 10, height: 4, depth: 6, color: "red" }));
console.log(describeBox({ color: "blue", depth: 6, height: 4, width: 10 }));
```

Both calls give the same measurements, because the keys — not their order — decide what goes where. The swap bug cannot happen.

This is the dominant style in the libraries you meet later. A call like `circle({ radius: 10 })` is one function, one argument, and that argument is an object literal being built on the spot.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **positional arguments** | Values matched to parameters by their order in the call |
| **options object** | A single object argument carrying named values |
| **named argument** | A value that travels with its key, so order does not matter |
| **swap bug** | Two same-typed values passed in the wrong order, unnoticed |
| **`{ }` in a call** | An object literal built on the spot and handed to the function |
