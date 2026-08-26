## Three parts, all useful

When a program goes wrong, the browser tells you what happened. Beginners often skim past the message because it looks technical. It is usually the most useful sentence available.

```
Uncaught ReferenceError: totl is not defined
    at line 3
```

| Part | Here | What it tells you |
|---|---|---|
| **The kind** | `ReferenceError` | A name was used that does not exist |
| **The detail** | `totl is not defined` | The exact thing it could not find |
| **The place** | `at line 3` | Where to look |

That message is telling you there is a typo **and telling you what the typo says**. The fix is to compare `totl` with the name you meant.

`ReferenceError` specifically means the name was used but never created. Check the spelling first, then check that the line declaring it actually runs before this one.

### Describing the problem often solves it

"It doesn't work" is not a description, and it is the hardest thing to get help with.

"It says `ReferenceError: totl is not defined` on line 3" **is** a description, and it often answers itself while you are typing it out. Reading the message is the first debugging step and it is free.

**What you'll learn from it:**
- An error message has three parts: the kind, the detail, the place.
- `ReferenceError` means a name was used that does not exist.
- The detail usually names your typo exactly.
- Describing the error precisely is itself a debugging technique.

**Try it:**

```js live plain
let total = 10;
console.log("Total is " + total);
```

Now change `total` to `totl` on the second line and run it again. You will get exactly the error above, and you will have caused it on purpose, which is a genuinely good way to learn to read messages, because **you already know what the answer is.**

Three things to notice when it fires: the kind is `ReferenceError` and not something about values; the detail is your typo, spelled out; and the line number points at where the name was *used*, not where it should have been declared.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **error message** | The browser's report of a failure: kind, detail, place |
| **`ReferenceError`** | A name was used that does not exist, usually a typo |
| **uncaught** | Nothing in the program handled the error, so it stopped |
| **stack trace** | The list of lines showing where the error happened |
