## Plain English to Pseudocode: Decision Tree for Form Choice

**What you'll practise:**
- Turning a rule you already know into exact, numbered steps
- Asking **one** question per decision, in the right order
- Giving each of three outcomes its own result
- Reading a flow chart and matching each box to a step

### The plan, in plain English

So far you have written code. This lab is about a **rule**: the choice between a function declaration and an arrow function.

1. Read in the job of the function.
2. If it is a main operation called from several places, write a function declaration.
3. Otherwise, if its body is a single expression, write a one-line arrow with an implicit return.
4. Otherwise, write an arrow with a block body and an explicit `return`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code each result describes

```js
// a declaration: main operation, called from several places
function main() {
  run();
}

// a one-line arrow: single expression, implicit return
const double = (n) => n * 2;

// an arrow with a block body: more than one statement
const describe = (n) => {
  const twice = n * 2;
  return "twice is " + twice;
};
```

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one. Plain English is fine: the AI reads what your steps mean.

| Write this | Use it for |
|---|---|
| `READ the job of the function` | the start |
| `IF called from several places` ... `ELSE IF` ... `END IF` | the two questions |
| `WRITE a function declaration` | one of the three results |

### Two questions, not one

1. **First: is it a main operation called from several places?** If yes, the answer is a declaration and you stop.
2. **Second: is the body a single expression?** If yes, a one-line arrow. If not, an arrow with a block body.

A diamond holds one question. "Called from several places **and** a single expression" is two questions pretending to be one.

### Before you submit

Press **Grade** above the editor. Before you submit, test three cases by hand: a named `main()` called from five places; a one-expression callback; a helper that needs several statements. Each must reach exactly one form.
