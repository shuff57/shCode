## JSON.stringify: packing objects into strings

**Read before the 6.10.10 parsing lesson.** About 5 minutes.

By the end of this reading you should be able to answer:

- What does `JSON.stringify` do to a JS object?
- Why does this unit pack an object with it before calling `storeItem`?
- What does the resulting string look like?

You already know `storeItem('key', value)`, and from 6.10.6 that it writes a value down as JSON so a number comes back a number. It would take a whole object the same way. This unit still packs the object into JSON text yourself, with `JSON.stringify`, for two reasons: you can see exactly what goes into the save slot, and the same code works anywhere that stores text only, like the browser's `localStorage` from 3.8.15. `JSON.stringify` is the tool every JavaScript program uses for that job.

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
  text('Check the console: 3 lines printed.', 20, 90);
}
```

**What you'll see:** the console prints the object, then the JSON string `{"score":42,"level":3,"playerX":100,"playerY":200}`, then confirms it was stored.

Notice the JSON string has double quotes around every key name. That's how JSON always looks: keys and strings get double quotes, numbers don't.

**The rule this unit follows:** pack with `JSON.stringify` on the way in, and unpack with `JSON.parse` on the way out (the next reading, 6.10.10). `storeItem` saves the packed text, and `getItem` hands the same text back.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **JSON** | JavaScript Object Notation: a text format for representing structured data. |
| **Serialization** | Converting a living object in memory into a flat string for storage or sending. |
| **`JSON.stringify(obj)`** | The serialization step. Takes an object, returns a JSON string. |
