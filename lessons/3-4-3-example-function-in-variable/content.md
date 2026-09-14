**Goal:** Prove that a function is a value by copying one into a variable — and see the one keystroke that turns that copy into a mistake.

## Step 1: A function, and its two faces

Run this. The first line calls `greet`; the second asks what `greet` *is*.

```js live plain
function greet() {
  return "Hello!";
}

console.log(greet());        // call
console.log(typeof greet);   // value
```

`greet()` prints `"Hello!"`. `greet` prints `function`. The same name, two completely different things, decided entirely by the parentheses.

## Step 2: Copy the function — no parentheses

Leaving the parentheses off assigns the function *itself* to `sayHello`. Both names now point at the one function.

```js live plain
function greet() {
  return "Hello!";
}

const sayHello = greet;      // the function value, no parentheses

console.log(sayHello());
console.log(greet());
```

Both lines print `"Hello!"`. There is only one function in this program, and it has two names.

## Step 3: Break it on purpose — add the parentheses

This step calls the function *first* and stores the result. `sayHello` is now a string, so calling it fails.

```js live plain
function greet() {
  return "Hello!";
}

const sayHello = greet();    // the RESULT — this is "Hello!", not a function

console.log(sayHello);       // just prints the string
try {
  console.log(sayHello());   // TypeError: sayHello is not a function
} catch (err) {
  console.log(err.name + ": " + err.message);
}
```

`sayHello` held `"Hello!"`, and a string cannot be called. This is the mistake to recognise: `greet` copies the function, `greet()` calls it and copies the answer.

## Key takeaways

- A function is a value: it can be stored in a variable and printed like any other.
- `greet` is the value; `greet()` is a call that produces a value.
- `const copy = greet;` aliases the same function under a new name.
- A stray `()` at the moment of copying stores the return value instead of the function.
