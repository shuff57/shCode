## JSON.parse: unpacking strings back into objects

**Read before the 2.5.10 round-trip lesson.** About 5 minutes.

By the end of this reading you should be able to answer:

- What does `JSON.parse` do to a JSON string?
- How do you access individual fields after parsing?
- Why does `JSON.parse` fail on a missing key?

You now know `JSON.stringify` turns an object into a string. `JSON.parse` does the reverse: it takes a JSON string and builds a live JavaScript object from it.

**What you'll learn from it:**

- `JSON.parse(str)` converts a JSON string back into a JS object.
- Once parsed, you can access fields with `.` notation like any other object.
- `JSON.parse` throws an error if the string is not valid JSON, so only call it when you know the key exists.

**Try it:**

```js live
let saved;

function setup() {
  new Canvas(400, 250);
  console.log('save slot exists:', getItem('save') !== null);

  let raw = getItem('save');
  if (raw === null) {
    console.log('no save found: storing a default');
    storeItem('save', JSON.stringify({ score: 42, level: 3, playerX: 100, playerY: 200 }));
  } else {
    saved = JSON.parse(raw);
    console.log('restored:', saved);
  }
}

function draw() {
  background('#222');

  if (saved) {
    fill('lime');
    textSize(18);
    text('Loaded save:', 20, 50);
    fill('white');
    textSize(16);
    text('score: ' + saved.score, 20, 80);
    text('level: ' + saved.level, 20, 100);
    text('playerX: ' + saved.playerX, 20, 120);
    text('playerY: ' + saved.playerY, 20, 140);
  } else {
    fill('#ff5555');
    textSize(16);
    text('No save loaded: refresh the page.', 20, 90);
  }
}
```

**What you'll see:** the first run stores a default save. Refresh the page, and this time the console says "restored:" with the object. The canvas displays every field from the save.

That's the pattern: `getItem` to pull the string out, `JSON.parse` to turn it back into something useful.

**Watch out:** `JSON.parse(null)` or `JSON.parse(undefined)` throws an error. Always check `getItem` returns a real string before parsing.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Deserialization** | The reverse of serialization: turning a flat string back into a living object. |
| **`JSON.parse(str)`** | The deserialization step. Takes a JSON string, returns a JS object. |
