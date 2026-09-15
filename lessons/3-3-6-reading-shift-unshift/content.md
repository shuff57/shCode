## Adding and Removing from the Front

**What you'll learn:**
- That `.unshift()` and `.shift()` do for the front what `.push()` and `.pop()` do for the back
- How `.shift()` gives back the value it removes
- Which method to reach for depending on which end of the list you mean

You already know `.push()` adds to the back and `.pop()` removes from the back. JavaScript gives you the matching pair for the front of the list:

| Method | Adds or removes | Which end |
|--------|-----------------|-----------|
| `.push(x)` | adds `x` | back |
| `.pop()` | removes one | back |
| `.unshift(x)` | adds `x` | front |
| `.shift()` | removes one | front |

**Try it:** Run the block. Watch `unshift` put a new item on the front while `push` puts another on the back of the same array, so you can see the two ends fill up.

```js live plain
let line = ["ana", "bob"];

line.unshift("zoe");   // front
line.push("mia");       // back
console.log(line);      // ["zoe", "ana", "bob", "mia"]
```

`shift()` removes the first item **and returns it** — the same double-job idea as a function `return` from Module 3.2. Store the return value if you need the person who just left the front.

**Try it:**

```js live plain
let line = ["ana", "bob", "mia"];

let first = line.shift();   // "ana" leaves, and we keep it
console.log(first);         // "ana"
console.log(line);          // ["bob", "mia"]
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`.push(x)`** | Add `x` to the end of the array |
| **`.pop()`** | Remove and return the last item of the array |
| **`.unshift(x)`** | Add `x` to the front of the array |
| **`.shift()`** | Remove and return the first item of the array |
