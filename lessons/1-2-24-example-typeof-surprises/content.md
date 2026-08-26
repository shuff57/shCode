**Goal:** Meet the three `typeof` answers that need explaining, so that when one of them appears in your own debugging you do not lose twenty minutes to it.

## Step 1: Math is an object

```js live plain
console.log(typeof Math);
```

`"object"`, and this one is **correct**. `Math` is a built-in object that provides maths operations (`Math.round`, `Math.max`, and so on). It bundles a collection of related things, which is exactly what the object type is for. No surprise here once you know what `Math` is.

## Step 2: typeof null is wrong

```js live plain
console.log(typeof null);
```

`"object"`, and this one is simply **wrong**. `null` is not an object. It is its own separate type, as 1.2.19 said.

This is a famous bug, present in the very first version of JavaScript in 1995 and never fixed. Not because nobody noticed, but because by the time it was noticed, enough code depended on the wrong answer that correcting it would have broken the web. So it stayed.

Two things to take from that. Practically: **never use `typeof` to test for `null`**: it will tell you `"object"` and you will chase the wrong bug. Historically: this is what "kept for compatibility" costs, and why language designers are careful early on.

## Step 3: Functions report as functions

```js live plain
function greet() {
  console.log("hi");
}

console.log(typeof greet);
```

`"function"`: which is a third kind of odd. There is no separate "function" type in JavaScript's list of eight; functions are a kind of object. But `typeof` treats them specially and reports `"function"` anyway, because in practice that is the answer you wanted.

So `typeof` can return a string that is not one of the eight type names. Useful, and inconsistent, and both of those are true at once.

## Step 4: All together

```js live plain
console.log(typeof "hello");           // "string"
console.log(typeof 42);                // "number"
console.log(typeof true);              // "boolean"
console.log(typeof undefined);         // "undefined"
console.log(typeof null);              // "object"  <-- the bug
console.log(typeof { name: "Sarah" }); // "object"
```

Line five is the one to remember. Everything else on that list says what you would expect.

## Key takeaways

- `typeof Math` is `"object"` and is correct: `Math` really is a built-in object.
- `typeof null` is `"object"` and is **wrong**, kept since 1995 for compatibility.
- Never test for `null` with `typeof`.
- `typeof` a function gives `"function"`, which is not one of the eight types.
