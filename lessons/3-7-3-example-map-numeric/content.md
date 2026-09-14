**Goal:** Build a new array from a numeric one with `.map()`, and watch the original stay exactly as it was.

## Step 1: The loop version

Here is the job done by hand. A `for` loop visits each price and pushes the taxed value into a second array. Run it and confirm the output.

```js live plain
const prices = [10, 20, 30];
const withTax = [];

for (let i = 0; i < prices.length; i++) {
  withTax.push(prices[i] * 1.08);
}

console.log(withTax);
```

## Step 2: The `.map()` version

`.map()` replaces the whole loop. The callback receives one price and returns what should replace it. The method collects those returns into a new array.

```js live plain
const prices = [10, 20, 30];
const withTax = prices.map((price) => price * 1.08);

console.log(withTax);
console.log(prices);
```

Notice the last line: `prices` still holds `[10, 20, 30]`. `.map()` builds a new array and leaves the input alone.

## Step 3: Change the rule, not the walk

The only part that changes between jobs is the callback. Halve every price by returning a different expression; the array-walking stays the same.

```js live plain
const prices = [10, 20, 30];
const halfOff = prices.map((price) => price / 2);

console.log(halfOff);
console.log(prices);
```

## Key takeaways

- `.map()` calls your callback once per element and collects each return value into a new array.
- The new array always has the same length as the original.
- The original array is never changed, so assign the result to a variable to keep it.
- The callback's return type does not have to match the input type.
