## Spreading an Array into Arguments

**What you'll learn from it:**
- Why a function like `Math.max` wants separate arguments, not one array
- How `...` at a call site unpacks an array into separate arguments
- Why `Math.max([3, 9, 4])` gives `NaN` while `Math.max(...[3, 9, 4])` gives `9`
- How to read `...name` in a function signature as a **rest parameter**
- That the same three dots mean gather in a definition and unpack at a call

Some functions take several separate arguments rather than one array. `Math.max` is the standard example:

```js live plain
console.log(Math.max(3, 9, 4));
console.log(Math.max([3, 9, 4]));
```

Handed three numbers it works. Handed one array it produces `NaN`, because an array is not a number and `Math.max` was never asking for a list. The **spread operator** `...` unpacks an array into separate arguments:

```js live plain
const numbers = [3, 9, 4];

console.log(Math.max(...numbers));
```

`Math.max(...numbers)` becomes `Math.max(3, 9, 4)`. The three dots go at the call, not in the array.

The same three dots mean the mirror image when they appear in a function's *definition* — gather all the arguments into an array. This is a **rest parameter**:

```js live plain
function total(...numbers) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum = sum + numbers[i];
  }
  return sum;
}

console.log(total(1, 2, 3));
console.log(total(5, 5));
```

`total(...numbers)` in a definition means "collect however many arguments into an array called `numbers`". `total(...numbers)` at a call site means the reverse. Same symbol, opposite direction — which side of the function it appears on tells you which.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **spread operator (`...`)** | Expands an array's elements into separate items at a call site |
| **`Math.max(...arr)`** | Equivalent to writing the array's elements as separate arguments |
| **rest parameter** | `...name` in a function definition; collects arguments into an array |
| **position tells direction** | `...` in a definition gathers; at a call site it unpacks |
