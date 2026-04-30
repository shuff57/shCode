## Deleting saved data

**Read before attempting `2.5.12 A16.1 Persistent High Scores`.**

What you'll learn from it:

- `removeItem(name)` deletes a single key from localStorage.
- `clearStorage()` wipes everything this site has stored.
- Both are common in test and debug flows — use them to reset your save state cleanly.
- A16.1 requires a "clear" button so you can demo persistence + reset live.

**Try it:** run the sketch. Two keys get stored in `setup`. Press **C** in the canvas — `clearStorage()` fires and logs `'cleared'`. Reload the page and open DevTools → Application → Local Storage to confirm both keys are gone.

```js live
function setup() {
  new Canvas(400, 200);
  storeItem('x', 1);
  storeItem('y', 2);
  console.log('x after store:', getItem('x'));
  console.log('y after store:', getItem('y'));
}

function draw() {
  background('#222');
  text('Press C to clear storage', 20, 110);
  if (kb.presses('c')) {
    clearStorage();
    console.log('cleared — x is now:', getItem('x'));
  }
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`removeItem(name)`** | Deletes the single key `name` from localStorage. |
| **`clearStorage()`** | Wipes all keys this site has stored in localStorage. |
