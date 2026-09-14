## Printing Is Not Returning

**What you'll learn:**
- That `console.log` shows a value to a human while `return` gives it to the program
- What `undefined` means when a function finishes without returning
- How to spot a missing `return` from the symptom
- Why printed output cannot be reused by the caller

This is the single most common misunderstanding about functions, and it is worth slowing down for. `console.log` shows a value to a **human**. `return` gives a value to the **program**. They are not alternatives; they do unrelated things.

```js
function addAndPrint(a, b) {
  console.log(a + b);
}

const total = addAndPrint(2, 3);
console.log("total is: " + total);
```

**Try it:** Run the block and read the output carefully. The `5` appeared, so the arithmetic was right, but `total` is `undefined`.

```js live plain
function addAndPrint(a, b) {
  console.log(a + b);
}

const total = addAndPrint(2, 3);
console.log("total is: " + total);
```

The function displayed its answer and then discarded it. A function that finishes without executing a `return` statement produces the value `undefined`. The function still ran; it simply handed nothing back.

The fix is one word:

```js live plain
function add(a, b) {
  return a + b;
}

const total = add(2, 3);
console.log("total is: " + total);
console.log("and doubled: " + total * 2);
```

Now `total` is a real number, which is why it can be doubled. A printed value could not be.

**The tell is `undefined` in the wrong place.** If a variable holding a function's result prints as `undefined` even though the function clearly worked, look for a missing `return`. Beginners often add a second `console.log` to "check the value", see the right number printed from inside the function, and conclude the function is fine. But that print is coming from *inside*, and proves nothing about what came *out*.

**Try it:** Add a `return` in place of the print in the first block and watch `total` change from `undefined` to a number.

```js live plain
function addAndReturn(a, b) {
  return a + b;
}

const total = addAndReturn(2, 3);
console.log("total is: " + total);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`console.log`** | Shows a value to a human reading the console; leaves nothing for the program |
| **`return`** | Hands a value to the program, which can store or reuse it |
| **`undefined`** | The value a call produces when the function finished without a `return` |
| **missing return** | The usual cause when a correct computation yields `undefined` |
