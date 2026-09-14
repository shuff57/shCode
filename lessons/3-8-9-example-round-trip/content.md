**Goal:** Send a value out to JSON text and back, and see that the restored value is a fully independent object.

## Step 1: Out and back

A **round trip** is `JSON.stringify` followed by `JSON.parse`. Run this and check that the restored value behaves like the original.

```js live plain
const original = { width: 10, height: 4, tags: ["red", "small"] };

const saved = JSON.stringify(original);
const restored = JSON.parse(saved);

console.log(saved);
console.log(restored.width + restored.height);
console.log(restored.tags[1]);
```

`restored.width + restored.height` gives `14` and `restored.tags[1]` gives `"small"`. The numbers came back as numbers, and the array came back as an array.

## Step 2: The restored copy is a new object

A plain assignment (`const alias = original`) gives you a second name for the **same** object. The round trip gives you a new one, so changing the copy leaves the original alone.

```js live plain
const original = { size: { width: 10, height: 4 } };

const alias = original;
const copy = JSON.parse(JSON.stringify(original));

alias.size.width = 999;

console.log(original.size.width);
console.log(copy.size.width);
```

Changing it through `alias` changed `original`, because they are the same object. `copy` was rebuilt from text and is completely independent — all the way down through the nested object.

## Step 3: Why that makes a deep copy

The spread copy `{ ...original }` copies only the top level, so a nested object is still shared. The round trip rebuilds every level from text, so nothing is shared at all.

```js live plain
const original = { size: { width: 10, height: 4 } };

const shallow = { ...original };
const deep = JSON.parse(JSON.stringify(original));

shallow.size.width = 999;

console.log(original.size.width);
console.log(deep.size.width);
```

`original.size.width` is `999` — the shallow copy shared the inner object. `deep.size.width` is still `4`. That difference is the round trip's second use, after saving and loading.

## Key takeaways

- A round trip is `JSON.parse(JSON.stringify(value))` — out to text and back.
- The result is a brand-new, fully independent copy, nested values included.
- A plain assignment shares one object; `{ ...obj }` shares the nested objects too.
- The round trip copies all the way down, which is what makes it a deep copy.
- The copy is rebuilt from text, so anything JSON cannot carry is not in it.
