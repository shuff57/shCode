## Plain English to Pseudocode: Full Syntax-Forms Comparison

**What you'll practise:**
- Turning one operation that passes through all three function forms into numbered steps
- Seeing which form needs a name, which needs `return`, and which can drop it
- Asking two questions in the right order
- Ending every path at one print

### The plan, in plain English

The three forms are usually shown as three separate examples. This lab writes them as **one** plan:

1. Read in the operation: add two numbers.
2. If the function is named, write `addA` as a function declaration with an explicit `return`.
3. If it is not named, ask whether it is written with `=>`. If it is not, write `addB` as a function expression assigned to a `const`, with an explicit `return`.
4. If it is, write `addC` as an arrow function with an implicit return.
5. Print the results of `addA(1, 2)`, `addB(1, 2)` and `addC(1, 2)`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
function addA(a, b) {
  return a + b;
}

const addB = function (a, b) {
  return a + b;
};

const addC = (a, b) => a + b;

console.log(addA(1, 2), addB(1, 2), addC(1, 2));
```

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one. Plain English is fine: the AI reads what your steps mean.

| Write this | Use it for |
|---|---|
| `IF the function is named` ... `ELSE IF it is written with =>` ... `END IF` | the two questions |
| `WRITE addA as a function declaration` | one of the three forms |
| `PRINT addA(1, 2), addB(1, 2), addC(1, 2)` | the one print |

### The order of the two questions

1. **First: is the function named?** The declaration is the one with a name.
2. **Second, only for the unnamed ones: is it written with `=>`?** Of the two unnamed forms, only the arrow uses `=>`.

That second question is the whole comparison. The three forms are **one** choice made three times, so they meet at one print, not three.

### Before you submit

Press **Grade** above the editor. Before you submit, trace it by hand: the three calls all compute `1 + 2`, so the print is `3 3 3`. Follow each form and check that it reaches the one print.
