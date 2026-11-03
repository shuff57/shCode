## Reading back a saved value

**Read before attempting `6.5.7 Worked Example: Load and Display a High Score`.**

Once your game has saved data with `storeItem`, you need a way to read it back. `getItem(key)` retrieves the value stored under the key name you gave it earlier.

**Try it:** the sketch saves `'playerName'` in `setup()`, then reads it back and displays it. Run it, reload the page, and the name is still there.

```js live
let name;

function setup() {
  new Canvas(400, 200);
  storeItem('playerName', 'Alex');
  name = getItem('playerName');
}

function draw() {
  background('#222');
  text(`Welcome back, ${name}!`, 10, 30);
  text('Your save data was loaded on startup.', 10, 60);
}
```

---

## What you get back

`getItem` returns one of two things:

- **The value you saved, as the same type.** Save a number and you get a number back; save text and you get text back; save `true` and you get `true` back.
- `null` if the key has never been saved.

That is different from the browser's own `localStorage` in 3.8.15, which gave back text whatever you saved. moSHion's `storeItem` writes your value down in a form that remembers its type, and `getItem` reads it back that way. What to do with that `null`, and the one case where you still get text, is the next reading (6.5.6).

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`getItem(key)`** | moSHion function: reads the value from the save slot named `key`. Returns it as the type you saved (a number stays a number), or `null` if nothing was saved yet. |
| **key** | The string name of the save slot you want to read: must match the key you used with `storeItem`. |
| **`null`** | JavaScript's way of saying "nothing here." `getItem` returns `null` when the key has never been used. |
