## A Function Held as a Property

**What you'll learn:**
- That a property's value can be a function
- How calling a method differs from holding the function

A **method** is a property whose value is a function. Nothing new is needed for this: a function is a value, so it can be stored under a key.

**Try it:** Define an object with one plain property and one method, then call the method.

```js live plain
const counter = {
  count: 0,
  describe: function () {
    return "I am a counter.";
  }
};

console.log(counter.describe());
console.log(typeof counter.describe);
```

The parentheses are what call the function. `counter.describe` without them is the function value itself; `counter.describe()` runs it and gives back the return value.

## The Parentheses Rule

**What you'll learn:**
- Why a plain property takes no parentheses
- Why a method needs them

You have been calling methods since chapter 1 without the name for them. `console.log()` is the `log` method of the `console` object. `"hi".toUpperCase()` is a method of a string.

**Try it:** Compare a plain property (`length`) with a method (`toUpperCase`).

```js live plain
const word = "javascript";

console.log(word.toUpperCase());
console.log(word.length);
console.log(typeof word.toUpperCase);
```

`length` is a plain property, so there are no parentheses. `toUpperCase` is a method — a property holding a function — so calling it needs `()`. Leaving them off gives you the function itself.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **method** | A property whose value is a function |
| **calling a method** | Property access followed by `()`, as in `counter.describe()` |
| **plain property** | A property whose value is data, read with no parentheses |
| **function as a value** | A function can be stored under a key or in a variable |
| **`typeof fn`** | Reading a method without calling it reports `"function"` |
