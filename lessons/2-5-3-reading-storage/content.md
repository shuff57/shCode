## Writing and reading a single value

**Read before attempting `2.5.4 Worked Example — High Score with storeItem`.**

What you'll learn from it:

- `storeItem(name, value)` writes a key/value pair into the browser's localStorage.
- `getItem(name)` retrieves the stored value by name.
- The data survives page reloads — close the tab, come back, it's still there.
- Each `name` is a unique slot in the per-site storage.

**Try it:** run the sketch below. The console prints the stored value. Now reload the page — keep the `storeItem` call in place — the log still prints `42`. Next, comment out the `storeItem` line, reload again, and the value is still there from last run.

```js live
function setup() {
  new Canvas(400, 200);
  storeItem('lastScore', 42);
}

function draw() {
  background('#222');
  if (frameCount === 1) {
    console.log('stored value:', getItem('lastScore'));
  }
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Persistence** | Data that survives a page reload. |
| **localStorage** | Browser-provided key/value store (~5 MB) that persists across sessions. |
| **`storeItem(name, value)`** | q5play wrapper — writes `value` to localStorage under the key `name`. |
| **`getItem(name)`** | q5play wrapper — reads the value stored at key `name` from localStorage. |
