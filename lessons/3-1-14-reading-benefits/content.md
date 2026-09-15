## Why Bother?

**What you'll learn:**
- Three concrete reasons to write a function instead of leaving code inline
- The vocabulary for each one: modularity, reusability, maintainability

You already know *how* to define and call a function. This reading is about *why* — three reasons, and they build on each other.

1. **Modularity** — A function groups the code for one task in one place. Instead of scattering ten lines of distance math through your program, you put it in `calcDistance()`.
2. **Reusability** — Once defined, you can call a function as often as you like. Need a distance three times? Three calls, not three copies.
3. **Maintainability** — If the way you calculate distance has to change, you change one body instead of hunting every copy. Code that is modular and reusable is also far easier for someone else to pick up.

**Try it:** the block below prints a shop header three times, written out three separate times. Run it, then rewrite it so the header lives in one function called three times — the output should not change at all.

```js live plain
console.log("=== SHOP RECEIPT ===");
console.log("Item: Notebook  $4.50");

console.log("=== SHOP RECEIPT ===");
console.log("Item: Pen  $1.25");

console.log("=== SHOP RECEIPT ===");
console.log("Item: Eraser  $0.80");
```

If you got the same three lines of output using one `printHeader()` function called three times, you just did all three things at once: you named one task (modularity), ran it more than once (reusability), and left yourself exactly one line to edit if the header text ever changes (maintainability).

You have been reusing other people's functions all along — `console.log()`, `prompt()`, `Number()`, `Math.sqrt()`. Writing your own is the step from being a user of code to being an author of it.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **modularity** | Organizing code into separate groups, each responsible for a single task |
| **reusability** | The ability to use the same code many times without rewriting it |
| **maintainability** | How easy it is to change code without introducing errors |
