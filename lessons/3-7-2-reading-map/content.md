## Transforming a List with `.map()`

**What you'll learn from it:**
- Why a `for` loop that fills a second array is doing `.map()`'s job by hand
- How `.map(callback)` calls your callback once per element and collects each return value
- That `.map()` always returns a new array of the same length as the input
- That the original array is never changed
- That the output values do not have to be the same type as the input

Every "do this to each item" job has the same shape: walk the list, apply a rule, keep the results. You can write that walk by hand:

```js
const prices = [10, 20, 30];
const withTax = [];

for (let i = 0; i < prices.length; i++) {
  withTax.push(prices[i] * 1.08);
}
```

`.map()` is that arrangement built into the language. The method knows how to walk the array; your callback knows what to do with each item:

```js
const withTax = prices.map((price) => price * 1.08);
```

**Try it:** Run the block. `withTax` holds the transformed values, and `prices` is still the numbers you started with.

```js live plain
const prices = [10, 20, 30];
const withTax = prices.map((price) => price * 1.08);

console.log(withTax);
console.log(prices);
```

`.map()` calls your callback once for each element, collects what each call returns, and hands back a **new array**. The original is untouched, which is why the result has to be assigned to something.

The callback can do anything, including change the type. Strings in, numbers out:

```js live plain
const names = ["marisol", "dev", "priya"];

console.log(names.map((n) => n.toUpperCase()));
console.log(names.map((n) => n.length));
console.log(names.map((n) => "Hi " + n + "!"));
```

One note before the glossary: `.map()` always returns an array of the **same length**. If you want fewer items than you started with, `.map()` is the wrong tool, because it does not combine or drop results. It collects one output for every input.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`.map(callback)`** | Builds a new array by calling `callback` once per element and collecting the return values |
| **callback** | The function you hand to `.map()`; it runs once for each item |
| **non-mutating method** | One that returns something new and leaves the original array alone |
| **same length** | `.map()` always returns one output per input |
