## Saving by Key

**What you'll learn from it:**
- That `localStorage` saves text under a name you choose and survives the page closing
- That `setItem`, `getItem` and `removeItem` are its three methods
- That everything stored comes back as a **string**
- That a key which was never saved returns `null`, not `undefined`
- Why a load function has to test for that `null` before parsing

JSON gives you text. Storing that text so it survives the page closing is a separate job, and in a browser the simplest tool for it is **`localStorage`**. It works like an object with three methods, and it holds **strings only**:

- `localStorage.setItem(key, text)` — save under a name.
- `localStorage.getItem(key)` — read it back, or `null` if nothing was saved.
- `localStorage.removeItem(key)` — delete it.

**Try it:** Run the block. The second key was never saved, so its line says `null`.

```js live plain
localStorage.setItem("highScore", "1200");

console.log(localStorage.getItem("highScore"));
console.log(localStorage.getItem("nothingHere"));
```

Two things catch everybody, and they both come from "strings only". The first: save the number `1200` and you get back the string `"1200"`.

**Try it:** Run the block and watch the first line join text instead of adding.

```js live plain
localStorage.setItem("highScore", 1200);

const score = localStorage.getItem("highScore");
console.log(score + 1);
console.log(Number(score) + 1);
```

The first line joins two strings — `"12001"` — because `score` is text. This is the single most common storage bug there is. Wrap the read in `Number(...)` and the addition works.

The second: a key that was never saved gives `null`, so a first run has to cope with that.

**Try it:** Run the block. Nothing was ever saved under that key.

```js live plain
const saved = localStorage.getItem("settingsThatWereNeverSaved");

console.log(saved);

if (saved === null) {
  console.log("First run — using defaults.");
}
```

`getItem` returns `null` for a missing key — not `undefined`, not an empty string. That matters because `JSON.parse(null)` does not throw: it quietly returns `null`, so a missing key would slip through a load function unnoticed unless you test for it first.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **key-value storage** | Saving text under a chosen name and reading it back by that name |
| **`localStorage`** | The browser's key-value store; survives the page closing |
| **`setItem(key, text)`** | Saves text under `key` |
| **`getItem(key)`** | Reads it back, or returns `null` if the key was never saved |
| **`removeItem(key)`** | Deletes the entry |
| **strings only** | Everything stored is converted to text and comes back as text |
| **missing means `null`** | A never-saved key returns `null`, not `undefined` |
