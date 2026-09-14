## Parameters and Arguments

**What you'll learn:**
- What a parameter is, and where it is written
- What an argument is, and where it is written
- A way to keep the two words straight
- Why the distinction matters when you read someone else's code

These two words get used interchangeably in conversation and mean different things precisely. The distinction is about location: one word belongs to the definition, the other to the call.

A **parameter** is the name listed in a function's definition, inside the parentheses. It acts as a variable inside the function body and has no value until the function is called.

An **argument** is the actual value handed to a function when it is called. Each argument is assigned to the matching parameter for the duration of that call.

```js
function priceWithTax(price) {   // price is the PARAMETER
  console.log(price * 1.08);
}

priceWithTax(50);                 // 50 is the ARGUMENT
```

**Try it:** Run the block. Then change the argument from `50` to another number and run it again: the parameter `price` takes whatever value the call hands it.

```js live plain
function priceWithTax(price) {   // price is the PARAMETER
  console.log(price * 1.08);
}

priceWithTax(50);
priceWithTax(20);
```

A way to keep them straight: the **parameter** is the empty box drawn on the form, the **argument** is what somebody writes in it. The box is part of the form's design; the handwriting belongs to whoever fills it out.

That is the whole difference, and it matters because the two live in different places. A parameter is fixed when the function is written and never changes for that function. The arguments are chosen fresh at every call, so one function can be applied to many different values:

```js live plain
function area(w, h) {
  console.log(w * h);
}

area(3, 4);
area(10, 2);
area(7, 7);
```

`w` and `h` are the same two parameters every time. `3, 4` then `10, 2` then `7, 7` are three different sets of arguments, which is why the output changes even though the function never did.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **parameter** | A name in a function's definition that acts as a variable inside the body |
| **argument** | The actual value passed in when the function is called |
| **definition** | The `function name(...) { ... }` block written once |
| **call site** | The line where the function is invoked, and where the arguments live |
