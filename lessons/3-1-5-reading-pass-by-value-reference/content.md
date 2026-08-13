## Pass by value

**What you'll learn:**
- What "pass by value" means
- Which kinds of values JavaScript passes by value
- Why changing a number inside a function does not change the original

When you pass a **primitive** value — a number, string, or boolean — JavaScript hands the function a **copy**. Whatever the function does to that copy, the original variable outside stays the same.

Primitives are: `number`, `string`, `boolean`, `undefined`, `null`.

## Pass by reference

**What you'll learn:**
- What "pass by reference" means
- Which kinds of values JavaScript passes by reference
- Why pushing to an array inside a function changes the original

When you pass an **object** or an **array**, JavaScript hands the function a **reference** — a direct pointer to the same spot in memory. If the function modifies the object or array, the original is modified too.

**Try it:** Read the code and predict what each `console.log` will print. Then run it and check.

```js live plain
// --- Pass by VALUE (number) ---
function tryToDouble(n) {
  n = n * 2;
  console.log("inside function, n =", n);
}

var myNumber = 5;
tryToDouble(myNumber);
console.log("after function, myNumber =", myNumber); // still 5

// --- Pass by REFERENCE (array) ---
function addItem(arr) {
  arr.push("new item");
}

var myList = ["apple", "banana"];
addItem(myList);
console.log("after function, myList =", myList); // has "new item"
```

The number `myNumber` is unchanged because the function only modified a copy. The array `myList` was modified in place because the function received a reference to the real array.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **primitive** | A simple value: number, string, boolean, undefined, null |
| **pass by value** | The function gets a copy — changes inside don't affect the original |
| **pass by reference** | The function gets a pointer to the original — changes inside do affect it |
| **object / array** | Non-primitive values; always passed by reference in JavaScript |
| **mutation** | Changing an object or array in place (e.g., `.push()`, `arr[0] = ...`) |
