## Spreading into a New Array or Object

**What you'll learn from it:**
- How `[...first, ...second]` copies two arrays into one new array
- That mixing loose values in with spread is where spread reads better than `.concat()`
- How `{ ...base, color: "blue" }` makes an object copy with one value overridden
- Why the override must come **after** the spread
- That the original array or object is never changed

Spread also works inside a literal, where it copies the contents in. For arrays, `[...first, ...second]` does the same job as `first.concat(second)`. It reads better when you are mixing loose values in:

**Try it:** Run the block and read the original on the last line.

```js live plain
const first = [1, 2];
const second = [3, 4];

const joined = [...first, ...second];
const withExtra = [0, ...first, 99];

console.log(joined);
console.log(withExtra);
console.log(first);
```

The object form is the one you will reach for most, because it solves a problem that has no neat alternative: make a copy of an object with one or two values different.

```js live plain
const base = { width: 10, height: 4, color: "red" };

const blue = { ...base, color: "blue" };
const tall = { ...base, height: 40 };

console.log(blue);
console.log(tall);
console.log(base);
```

Read `{ ...base, color: "blue" }` as *"everything in `base`, then `color` set to blue"*. **Order matters**: the later entry wins, so the override must come after the spread. Written the other way round, `{ color: "blue", ...base }`, the spread would put the original red back. The original `base` is untouched in both cases.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`[...arr]`** | Copies an array's contents into a new array literal |
| **`[...a, ...b]`** | Joins two arrays into a new one; works like `.concat()` |
| **`{ ...obj }`** | Copies an object's key-value pairs into a new object literal |
| **Object spread with override** | `{ ...original, key: newValue }`, a copy with selected values replaced |
| **order matters** | The later entry wins, so the override must come after the spread |
