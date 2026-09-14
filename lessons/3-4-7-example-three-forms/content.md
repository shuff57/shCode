**Goal:** Write one function as a declaration, an expression, and an arrow, and prove the three are interchangeable when called.

## Step 1: The declaration

Start with the form you already know. `addDeclared` is a statement: it names a function.

```js live plain
function addDeclared(a, b) {
  return a + b;
}

console.log(addDeclared(2, 3));
```

It prints `5`. Nothing surprising yet.

## Step 2: The same function as an expression

Move the function to the right of an `=`. The name and the `function` keyword stay, but the whole thing is now a value assigned to a const.

```js live plain
const addExpressed = function (a, b) {
  return a + b;
};

console.log(addExpressed(2, 3));
```

Still `5`. The expression has no name after `function`; the const supplies the name.

## Step 3: The same function as an arrow

Drop `function` and `return` and put the parameters on the left of `=>`. The body is a single expression, so its value is returned automatically.

```js live plain
const addArrow = (a, b) => a + b;

console.log(addArrow(2, 3));
```

Still `5`, in one line. All three forms call identically; only the writing changed.

## Step 4: All three at once

Here they are in a single program. The final line calls all three with the same inputs.

```js live plain
function addA(a, b) {
  return a + b;
}

const addB = function (a, b) {
  return a + b;
};

const addC = (a, b) => a + b;

console.log(addA(1, 2), addB(1, 2), addC(1, 2));
```

It prints `3 3 3`. A function value is a function value, however it was written.

## Key takeaways

- Declaration, expression, and arrow are three spellings of one idea.
- The expression drops the name; the variable supplies it.
- The arrow also drops `function` and, for a single expression, `return`.
- All three are called the same way and behave the same way.
