## Chapter 2 Individual PA — Part 3 of 5: Find and Fix

**This is the debugging part of the test, and you are doing it alone.** Four broken
programs, **20 points total**, about **11 minutes**. You read the code, find the bug,
name its type (syntax / runtime / logic), and fix it.

**This part is summative:** one attempt, no marking shown, no explanations shown,
score not shown. Completion = submitting. The AI grader checks your fixes against the
rubric; the teacher reviews the marks.

---

### Bug 1 — the program does not run at all

```js
const TAX_RATE = 0.08;

let itemName = "Notebook;
let unitPrice = 4.25;
let count = 6;

let subtotal = unitPrice * count;

let shipping = "5";
let beforeTax = subtotal + shipping;

let tax = beforeTax * TAX_RATE;
let total = beforTax + tax;

count = 2;
let wrapFee = 1.5 * count;

console.log("Item: " + itemName);
console.log("Ordered: " + count);
console.log("Subtotal: " + subtotal);
console.log("Before tax: " + beforeTax);
console.log("Gift wrap: " + wrapFee);
console.log("Total: " + total);
```

**Fix it.** Above each fix, write a comment naming the bug kind: **syntax**, **runtime**, or **logic**.

---

### Bug 2 — the program stops part way through

```js
const TAX_RATE = 0.08;

let itemName = "Notebook";
let unitPrice = 4.25;
let count = 6;

let subtotal = unitPrice * count;

let shipping = 5;
let beforeTax = subtotal + shipping;

let tax = beforeTax * TAX_RATE;
let total = beforTax + tax;

count = 2;
let wrapFee = 1.5 * count;

console.log("Item: " + itemName);
console.log("Ordered: " + count);
console.log("Subtotal: " + subtotal);
console.log("Before tax: " + beforeTax);
console.log("Gift wrap: " + wrapFee);
console.log("Total: " + total);
```

**Fix it.** Above each fix, write a comment naming the bug kind: **syntax**, **runtime**, or **logic**.

---

### Bug 3 — the inner loop prints the wrong thing

```js
let total = 0;

for (let row = 1; row <= 3; row++) {
  for (let col = 1; col <= 3; col++) {
    if (col === 2) {
      continue;
    }
    total = total + row * col;
  }
}

console.log(total);
```

**Fix it.** Above the fix, write a comment naming the bug kind: **syntax**, **runtime**, or **logic**.

---

### Bug 4 -- the inner loop counter never advances

```js
let i = 0;
while (i < 5) {
  if (i % 2 === 0) {
    continue;
  }
  console.log(i);
  i++;
}
```

**Fix it.** Above the fix, write a comment naming the bug kind: **syntax**, **runtime**, or **logic**.

---

### Final step: name all four

Above each fix you just made, the comment should already say **syntax**, **runtime**,
or **logic**. Double-check that all four bugs have their kind named. The checklist
expects four comments, one per bug, with those exact words.