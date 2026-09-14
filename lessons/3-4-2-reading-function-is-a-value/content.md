## A Function Is a Value

**What you'll learn:**
- The difference between `greet` (the function itself) and `greet()` (a call)
- That `typeof` a function is `"function"`
- That you can copy a function into a second variable
- That two names can point at the very same function

Everything you have written so far treated a function as a piece of program *structure*: something you define and then call. JavaScript takes a stranger and more useful view. A function **is a value**, like `7` or `"hello"`, and it can be stored, copied, and passed around like one.

The whole idea lives in one pair of characters. `greet()` **calls** the function and gives you its return value. `greet`, with no parentheses, is the function *itself* — a value whose type is `"function"`.

**Try it:** Run the block and compare the two `console.log` lines. One prints a string, the other prints `function`.

```js live plain
function greet() {
  return "Hello!";
}

console.log(greet());        // the call: prints "Hello!"
console.log(typeof greet);   // the value: prints "function"
```

The second line is the surprising one. `typeof greet` never runs the function; it asks JavaScript what kind of value `greet` is, and the answer is `"function"`.

Because a function is a value, you can copy it into another variable. There is still only one function — `sayHello` and `greet` are two names for it, exactly as two variables can hold the same number.

**Try it:** Run this and watch both names print the same thing.

```js live plain
function greet() {
  return "Hello!";
}

const sayHello = greet;      // the value — no parentheses

console.log(sayHello());
console.log(greet());
```

Change `const sayHello = greet;` to `const sayHello = greet();` and run it again. Now `sayHello` holds the string `"Hello!"`, not the function, and `sayHello()` throws. The missing parentheses are the classic bug; whenever a function-valued variable behaves strangely, check for a stray pair first.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **function value** | A function treated as data, so it can be stored, copied, or passed |
| **`greet`** | The function itself — a value of type `"function"` |
| **`greet()`** | A **call**: runs the function and yields its return value |
| **`typeof greet`** | Prints `"function"` — the type of a function value |
| **copy** | `sayHello = greet` puts the same function under a second name |
| **stray parentheses** | `greet()` where you meant `greet`: stores the result, not the function |
