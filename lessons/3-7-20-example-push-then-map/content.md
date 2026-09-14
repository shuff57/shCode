**Goal:** Build a list with `.push()`, then transform it with `.map()` — the mutating tool and the non-mutating tool working in sequence.

## Step 1: Build the list with `.push()`

`.push()` changes the array it is called on. Start with an empty array and fill it in.

```js live plain
const scores = [];

scores.push(72);
scores.push(95);
scores.push(64);

console.log(scores);
```

## Step 2: Transform the built list with `.map()`

Now hand the finished list to `.map()`. The original `scores` stays put; the transformed values go into a new array.

```js live plain
const scores = [];

scores.push(72);
scores.push(95);
scores.push(64);

const curved = scores.map((score) => score + 5);

console.log(curved);
console.log(scores);
```

## Step 3: See the two roles side by side

`.push()` is how the list gets built up, `.map()` is how it gets read back out transformed. Run the block and read which array each line prints.

```js live plain
const scores = [];

scores.push(72);
scores.push(95);
scores.push(64);

const curved = scores.map((score) => score + 5);
const passed = curved.filter((score) => score >= 80);

console.log(scores);
console.log(curved);
console.log(passed);
```

## Key takeaways

- `.push()` mutates the array it is called on; that is exactly what you want while building a list.
- `.map()` returns a new array and leaves its input alone; that is what you want when transforming one.
- The two compose naturally: build a list, then map it.
- A transformed result can be filtered further, and the original list still has its starting values.
