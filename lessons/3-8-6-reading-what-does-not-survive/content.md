## What Does Not Survive

**What you'll learn from it:**
- That JSON cannot represent a function, so a method is dropped silently
- That an `undefined` value disappears the same way
- That there is no error and no warning when this happens
- Why it is not a bug: JSON stores data, not behaviour

JSON can represent objects, arrays, numbers, strings, booleans and `null` — and that is the whole list. A function is not on it. So when an object carries a method, `JSON.stringify` leaves the method out.

**Try it:** Run the block. The object has two properties; read how many come back.

```js live plain
const counter = {
  count: 5,
  describe: function () {
    return "I am a counter.";
  }
};

console.log(JSON.stringify(counter));
```

The output is `{"count":5}`. No error, no warning — the method is simply not there. `undefined` values disappear the same way:

**Try it:** Run the block and see how many of the three properties survived.

```js live plain
const settings = {
  theme: "dark",
  fontSize: undefined,
  level: 3
};

console.log(JSON.stringify(settings));
```

Only `theme` and `level` come out. The property whose value was `undefined` is skipped, exactly like the function was.

That silence is worth expecting rather than discovering. JSON stores **data**, not behaviour. If you save an object and load it back and its methods have vanished, nothing went wrong — you saved the data, which is all JSON was ever able to carry. A method is just a property whose value is a function, and functions are the one thing JSON was never built to hold.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **dropped silently** | Left out of the JSON with no error and no warning |
| **function / method** | A property whose value is a function; JSON cannot represent it |
| **`undefined`** | A value JSON cannot represent either; it disappears the same way |
| **data vs. behaviour** | JSON stores data; behaviour (functions) must be rebuilt by the program after loading |
