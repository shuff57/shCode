## Mutating

**What you'll learn:**
- What it means to mutate an object
- How to spot a mutation in a line of code
- Why everyone holding a reference sees the change

**Mutating** an object means changing its contents while leaving it the same object. `arr.push(4)`, `arr[0] = 7`, and `person.age = 31` are all mutations. You did not move anything to a new place — you reached into the object both names already point at and changed what is there.

**Try it:** Run it and check that both names report the same array, because there is only one array.

```js live plain
let scores = [1, 2, 3];
scores.push(4);

console.log(scores[3]);
console.log(scores.length);
```

Nothing was copied. The one array grew, so every name that points at it sees four items.

## Reassigning

**What you'll learn:**
- What it means to reassign a variable
- Why reassigning a parameter does not reach the caller
- How mutation and reassignment differ

**Reassigning** a variable means pointing that one name at something else entirely. `num = 99` and `arr = [9, 9]` are reassignments. Only that single name moves; everyone else still points where they did before.

A function can never reassign *your* variable. Its parameter is its own name, and when the function ends the name disappears, taking the reassignment with it.

**Try it:** Predict the output, then run it. The function really does point its parameter at a new array — but the caller's `scores` was never involved.

```js live plain
function replace(arr) {
  arr = [9, 9, 9];
  console.log("inside: ", arr);
}

let scores = [1, 2, 3];
replace(scores);
console.log("outside:", scores);
```

`inside` shows the brand-new array; `outside` still shows `[1,2,3]`. The parameter `arr` and the variable `scores` are two separate names that happened to start out pointing at the same array.

## `const` locks the name, not the contents

**What you'll learn:**
- Why `const` does not stop a `push`
- Which line `const` actually forbids

The two ideas meet here, and this is where they surprise almost everyone.

**Try it:** Predict what happens before you run it.

```js live plain
const items = ["pen"];
items.push("notebook");
console.log(items);
```

No error. `const` locks the **binding** — it promises that `items` will always point at this same array. Pushing does not change which array that is. Add `items = ["eraser"];` on the next line and you get `TypeError: Assignment to constant variable`, because that line reassigns. `const` blocks reassignment and permits mutation.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **mutating** | Changing an object's contents while leaving it the same object |
| **reassigning** | Pointing a name at a different value; affects only that one name |
| **reference** | The address of an object in memory, which is what a variable holding an object stores |
| **`const` binding** | The name is locked to one object; the object's contents stay editable |
| **parameter** | The function's own local name for an argument; reassigning it never reaches the caller |
