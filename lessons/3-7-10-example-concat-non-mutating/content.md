**Goal:** Join two arrays with `.concat()` and confirm neither input was changed, then contrast it with `.push()`.

## Step 1: Join two arrays

`.concat()` returns a new array. The first array's elements come first, then the second's.

```js live plain
const first = [1, 2];
const second = [3, 4];

const joined = first.concat(second);

console.log(joined);
```

## Step 2: Prove both inputs survive

Print the two originals after the join. Neither changed, because `.concat()` never touches what it is given.

```js live plain
const first = [1, 2];
const second = [3, 4];

const joined = first.concat(second);

console.log(joined);
console.log(first);
console.log(second);
```

## Step 3: Contrast with `.push()`

`push` changes the array it is called on and nests an array argument. `concat` returns a new flat array and mutates nothing. Run both and compare.

```js live plain
const a = [1, 2];
const b = [3, 4];

const c = a.concat(b);
a.push(b);

console.log(c);
console.log(a);
```

## Key takeaways

- `.concat()` returns a new array and leaves both inputs unchanged.
- An array argument is flattened one level: its elements are added individually.
- `.push()` mutates the array and nests an array argument; `.concat()` does neither.
- Like `.map()` and `.slice()`, `.concat()` is a non-mutating method.
