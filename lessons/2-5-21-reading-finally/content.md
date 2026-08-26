## finally

**What you'll learn:**
- A `finally` block attached to `try...catch` runs **either way**, whether or not an error happened
- `finally` is for cleanup that has to happen no matter what: closing something, resetting something

```js live plain
try {
  console.log("Opening the connection.");
  console.log(missingSetting);
  console.log("This never runs.");
} catch (err) {
  console.log("Handling: " + err.message);
} finally {
  console.log("Closing the connection.");
}
```

Now the same shape with nothing going wrong:

```js live plain
try {
  console.log("Opening the connection.");
  console.log("Work done.");
} catch (err) {
  console.log("Handling: " + err.message);
} finally {
  console.log("Closing the connection.");
}
```

`catch` ran in one case and not the other. `"Closing the connection."` ran in **both**: that's what makes `finally` different from just writing a line after the whole `try...catch`. You could put the cleanup line after the block instead, and often that works fine. The difference shows up if the `catch` block itself doesn't fully handle everything: an error escaping `catch` skips whatever comes after the block, but still runs `finally`. Reach for `finally` when the cleanup absolutely must happen even if the error handling fails too.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`finally`** | Runs after `try...catch`, whether or not an error occurred; for cleanup that must happen either way |
