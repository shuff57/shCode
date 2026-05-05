## JSON.stringify — packing objects into strings

**Read before the 2.5.9 parsing lesson.** About 5 minutes.

By the end of this reading you should be able to answer:

- What does `JSON.stringify` do to a JS object?
- Why do you need it before calling `storeItem`?
- What does the resulting string look like?

You already know `storeItem('key', value)`. But `storeItem` only accepts strings as the value. A number works because JS auto-converts it, but an object doesn't.

**What you'll learn from it:**

- `JSON.stringify(obj)` converts a JavaScript object into a JSON string.
- Once it's a string, you can pass it to `storeItem` to persist your whole game state at once.
- The resulting string looks like the object but with double quotes around every key and string value.

**Try it:**

```js live
let gameState = {
  score: 42,
  level: 3,
  playerX: 100,
  playerY: 200
};

function setup() {
  new Canvas(400, 200);
  console.log('gameState object:', gameState);

  let asJSON = JSON.stringify(gameState);
  console.log('as JSON string:', asJSON);

  storeItem('save', asJSON);
  console.log('stored under key "save"');
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('Check the console — 3 lines printed.', 20, 90);
}
```

**What you'll see:** the console prints the object, then the JSON string `{"score":42,"level":3,"playerX":100,"playerY":200}`, then confirms it was stored.

Notice the JSON string has double quotes around every key name. That's how JSON always looks — keys and strings get double quotes, numbers don't.

**The golden rule:** `storeItem` wants a string. `JSON.stringify` gives you a string. They pair perfectly.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **JSON** | JavaScript Object Notation — a text format for representing structured data. |
| **Serialization** | Converting a living object in memory into a flat string for storage or sending. |
| **`JSON.stringify(obj)`** | The serialization step. Takes an object, returns a JSON string. |
