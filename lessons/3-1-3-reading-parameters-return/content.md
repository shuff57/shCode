## Parameters & Return Values

**What you'll learn:**
- How parameters let you pass different inputs to the same function
- How `return` sends a value back out of a function
- How to store a returned value in a variable
- The difference between a function that prints vs one that returns

### Parameters — giving a function inputs

A **parameter** is a variable listed inside the function's parentheses. When you call the function, the value you pass in becomes that variable inside the function.

```
function greet(name) {
  console.log("Hello, " + name + "!");
}

greet("Alice");   // prints: Hello, Alice!
greet("Bob");     // prints: Hello, Bob!
```

The same function, two different results, because the input changed.

### Return — getting a value back out

`console.log` inside a function prints something, but the result disappears. If you want to *use* the result later, use `return`:

```
function add(a, b) {
  return a + b;
}

let result = add(3, 4);
console.log(result);   // 7
```

`return` hands the value back to whoever called the function. You can then store it, print it, or use it in another expression.

**Try it:** Run the block. Then change the two numbers passed to `add` and run it again.

```js live plain
function add(a, b) {
  return a + b;
}

let result = add(10, 5);
console.log(result);

// This function prints directly — the result is NOT stored anywhere
function showSum(a, b) {
  console.log(a + b);
}

showSum(10, 5);
```

Both lines output `15`, but they work differently. The first stores the result in `result` so you could use it again. The second just prints and the value is gone.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **parameter** | A variable in a function's `()` that receives an input value when the function is called |
| **argument** | The actual value you pass in when calling the function — e.g. the `10` in `add(10, 5)` |
| **`return`** | Sends a value back out of the function to the caller |
| **return value** | The value a function hands back via `return` |
| **void (no return)** | A function with no `return` gives back `undefined` — useful for side-effects like printing |
