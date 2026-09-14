## Getting a Value Back with `return`

**What you'll learn:**
- How `return` sends a value back out of a function
- How to store a returned value in a variable
- That a call to a returning function is itself a value
- Where a call can appear once it has a value

Parameters send information *in*. `return` sends a value back *out*. Most functions so far printed their result and that was the end of it, but printing puts text on the screen, where your program cannot use it. Compare a function that prints with one that returns:

```js
function doubleAndPrint(n) {
  console.log(n * 2);
}

function doubleAndReturn(n) {
  return n * 2;
}

doubleAndPrint(5);

const result = doubleAndReturn(5);
console.log("I can use this: " + (result + 1));
```

Both functions computed `10`. Only the second one *handed it back*, so the calling code could store it in `result` and do arithmetic with it. The first threw the number away the instant it was displayed.

**Try it:** Run the block. `result` holds a real number, which is why it can be used in the `+ 1`.

```js live plain
function doubleAndReturn(n) {
  return n * 2;
}

const result = doubleAndReturn(5);
console.log("I can use this: " + (result + 1));
```

`return` is what makes a function call an *expression*, something with a value, rather than just an instruction. That is why a call can appear anywhere a value can:

```js live plain
function square(n) {
  return n * n;
}

console.log(square(4));
console.log(square(3) + square(4));

const gap = square(6) - square(5);
console.log(gap);
```

`square(3) + square(4)` works because each call *becomes* its number: `9 + 16`. The call is not a line the program runs and forgets; it is a value the surrounding expression waits for.

**Try it:** Change `square(4)` to another number and predict the new output before you run it.

```js live plain
function square(n) {
  return n * n;
}

console.log(square(4));
console.log(square(3) + square(4));
```

A returned value can be stored, printed, compared, added, or passed straight into another call. A printed value can only be looked at.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`return`** | A statement that ends a function and sends a value back to the caller |
| **return value** | The value a function call produces, usable in a variable or an expression |
| **expression** | Code that produces a value, so it can be used as part of a larger calculation |
| **statement** | Code that performs an action but produces no value you can store |
