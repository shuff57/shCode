## The round-trip pattern

Read before `2.5.12 A16.1 Persistent High Scores`.

**What you'll learn from it:**

- localStorage only stores strings — you can't save an array or object directly.
- The round-trip is: `JSON.stringify(obj)` → `storeItem(key, str)` → `getItem(key)` → `JSON.parse(str)`.
- Skipping the `parse` on read gives back a string that *looks* like an object but isn't — `obj.score` would be `undefined`.
- This four-step pattern appears in every "save the player's data" flow.

**Try it:**

```js live
function setup() {
  let scores = [9, 7, 5];
  // Step 1 + 2: stringify and store
  storeItem('top3', JSON.stringify(scores));

  // Step 3 + 4: retrieve and parse
  let saved = JSON.parse(getItem('top3'));
  console.log(saved[0]);  // 9
  console.log(typeof saved);  // object
}

function draw() {}
```

After running once, comment out the `storeItem` line and reload the page — `saved[0]` should still be `9` because the value was persisted. Then add a new score to the array and store again to see the update.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Round-trip** | Sending a value through serialize → store → retrieve → deserialize and getting back an equivalent value. |
| **Serialize** | Convert a value to a storable format (here: a JSON string). |
| **Deserialize** | Reconstruct a value from its stored format (here: `JSON.parse`). |
| **`storeItem(key, value)`** | Writes a string to the browser's localStorage under the given key. |
| **`getItem(key)`** | Reads back the string stored under the given key. Always returns a string. |
