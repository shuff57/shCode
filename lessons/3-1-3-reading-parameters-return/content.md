## Parameters

**What you'll learn:**
- How parameters let you pass different inputs to the same function
- How to give a function more than one parameter
- How the values you pass line up with the parameters, in order

### Parameters: giving a function inputs

A **parameter** is a variable listed inside the function's parentheses. When you call the function, the value you pass in becomes that variable inside the function.

```
function greet(name) {
  console.log("Hello, " + name + "!");
}

greet("Alice");   // prints: Hello, Alice!
greet("Bob");     // prints: Hello, Bob!
```

The same function, two different results, because the input changed.

### More than one parameter

A function can take several parameters, separated by commas. The values you pass are matched to them in order.

```
function introduce(name, age) {
  console.log(name + " is " + age + " years old.");
}

introduce("Alice", 15);
introduce("Bob", 16);
```

**Try it:** Run the block. Then change the name and age passed in the last call and run it again.

```js live plain
function introduce(name, age) {
  console.log(name + " is " + age + " years old.");
}

introduce("Alice", 15);
introduce("Bob", 16);
```

Each call prints a different line because the arguments changed. The function itself never did.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **parameter** | A variable in a function's `()` that receives an input value when the function is called |
| **argument** | The actual value you pass in when calling the function: e.g. the `"Alice"` in `introduce("Alice", 15)` |
