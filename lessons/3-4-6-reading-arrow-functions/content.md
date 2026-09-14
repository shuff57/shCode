## Arrow Functions

**What you'll learn:**
- The `(parameters) => result` shape and how to read the arrow
- That an arrow is a shorter function expression
- How to read the same function written three ways
- That an inline arrow is the usual form for a callback

Function expressions are wordy. `function` and `return` are a lot of typing for something as small as "add two numbers", and once functions start being passed around as values, that weight adds up fast. **Arrow functions** are a shorter way to write the same thing.

Read the arrow as *"goes to"*: the parameters `(a, b)` go to the value `a + b`.

**Try it:** One line, no `function`, no `return`, and the same answer.

```js live plain
const add = (a, b) => a + b;

console.log(add(2, 3));
```

That is the whole idea: `(a, b) => a + b` is a function value just like the ones you met in the last reading. Nothing about *being a function* changed — only the way you write it.

Here is the same function in all three forms. They behave identically when called.

**Try it:** Run it and confirm all three print `3`.

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

Because it is short, an arrow is usually written *inline* — directly inside the parentheses of a call — rather than named first. That is what almost every arrow in the rest of this course looks like.

**Try it:** Run this and see the same function value passed with no name at all.

```js live plain
function apply(fn, value) {
  return fn(value);
}

console.log(apply((n) => n * 10, 4));
```

`apply` does not know or care how the function was written. A function value is a function value.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **arrow function** | A compact function expression written `(parameters) => result` |
| **`=>`** | Read as "goes to": the parameters go to the resulting value |
| **function expression** | The general form; an arrow is one kind of it |
| **inline arrow** | An arrow written directly inside a call, never named |
| **callback** | A function passed to another function so it can be called |
