**Goal:** Copy an object with one value changed using `{ ...obj, field }`, and keep the original intact.

## Step 1: The object

Start with a plain object. `base` holds three properties, and you want variants of it without rebuilding it each time.

```js live plain
const base = { width: 10, height: 4, color: "red" };

console.log(base);
```

## Step 2: Override one property

Spread all of `base` into a new object, then restate the property you want different. The later entry wins, so `color` is blue.

```js live plain
const base = { width: 10, height: 4, color: "red" };

const blue = { ...base, color: "blue" };

console.log(blue);
console.log(base);
```

`base` is unchanged: the spread built a new object, and the override landed in that new object only.

## Step 3: The trap — order matters

Written with the override **before** the spread, the spread copies the original value back over it, and the override is lost.

```js live plain
const base = { width: 10, height: 4, color: "red" };

const right = { ...base, color: "blue" };
const wrong = { color: "blue", ...base };

console.log(right);
console.log(wrong);
```

## Key takeaways

- `{ ...base, field: value }` copies `base` and replaces `field`.
- The override must come **after** the spread, or the copied value wins.
- Adding a new property that was not in `base` works the same way.
- The original object is never changed.
