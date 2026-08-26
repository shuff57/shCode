## Defensive copying

**What you'll learn:**
- Why you sometimes need to copy an array or object before changing it
- How to copy an array with the spread syntax `[...arr]`
- How to copy an object with the spread syntax `{...obj}`

From the previous reading you know that arrays and objects are passed by reference. That means if you pass an array to a function and the function changes it, the original is changed too.

**Defensive copying** is a habit: make a copy first, then change the copy. The original stays untouched.

### Copying an array: `[...arr]`

```
let copy = [...original];
```

The `...` (spread) inside `[...]` unpacks every element of `original` into a brand-new array. `copy` and `original` are separate: changing `copy` does not touch `original`.

### Copying an object: `{...obj}`

```
let copy = {...original};
```

Same idea for plain objects. The `...` inside `{...}` copies every key-value pair into a new object.

> **One-level deep only.** Spread makes a *shallow* copy: nested arrays or objects inside are still shared. For now, all the arrays and objects in this course are flat, so spread is the right tool.

**Try it:** Predict what each `console.log` will print, then run it.

```js live plain
var scores = [90, 85, 78];

// Make a copy, then change the copy
var scoresCopy = [...scores];
scoresCopy.push(100);

console.log("original:", scores);    // [90, 85, 78]: unchanged
console.log("copy:", scoresCopy);    // [90, 85, 78, 100]

// Object copy works the same way
var student = { name: "Alex", grade: "A" };
var studentCopy = { ...student };
studentCopy.grade = "B";

console.log("original student:", student.grade);   // A: unchanged
console.log("copy student:", studentCopy.grade);   // B
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **defensive copying** | Making a copy of data before changing it to protect the original |
| **spread (`...`)** | Syntax that unpacks an array or object into a new one: `[...arr]`, `{...obj}` |
| **shallow copy** | A one-level-deep copy: nested objects inside are still shared |
| **mutation** | Changing data in place; defensive copying avoids unwanted mutations |
