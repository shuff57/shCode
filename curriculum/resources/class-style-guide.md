# CSCI 4 Class Style Guide — distributed Week 3, enforced all year

Every code assignment after Week 3 is graded against these rules. Keep this page.

---

## Indentation

- **2 spaces** per indent level. No tabs.
- Consistent nesting — every `{` increases indent by one level; every matching `}` decreases it.

```js
if (condition) {
  console.log("inside the block");   // 2 spaces
}
```

---

## Semicolons

- **Required** at the end of every statement. No exceptions.

```js
let score = 0;       // correct
let score = 0        // incorrect — missing semicolon
```

---

## Naming Conventions

| Kind | Convention | Example |
|------|-----------|---------|
| Variables | `camelCase` | `userName`, `totalCost` |
| Functions | `camelCase` | `calculateTax`, `printResult` |
| Constants | `UPPER_SNAKE_CASE` | `TAX_RATE`, `MAX_ITEMS` |
| Classes | `PascalCase` *(preview — Week 12)* | `ShoppingCart`, `GamePlayer` |

- Names must be **descriptive**. Single-letter names are only allowed for loop counters (`i`, `j`, `k`).
- No abbreviations unless the meaning is completely obvious (`num`, `len` are fine; `tp` for `taxPercent` is not).

---

## Comments

- Every line where the logic is not obvious must have an inline `//` comment.
- Comments explain **why** or **what**, not just echo the code:

```js
let subtotal = unitPrice * quantity;  // total before tax
```

- JSDoc comments above functions (you will practice these in Week 6):

```js
/**
 * Calculates total cost including tax.
 * @param {number} price - price before tax
 * @param {number} taxRate - tax rate as a decimal (e.g. 0.0725)
 * @returns {number} total cost
 */
```

- **No commented-out code in final submissions.**

---

## Spacing

- **One space around operators:** `x + y`, not `x+y`; `a >= b`, not `a>=b`
- **One space after commas:** `console.log(a, b)`, not `console.log(a,b)`
- One blank line between logical sections of code.
- No trailing whitespace at the end of a line.

---

## Braces

- Opening brace on the **same line** as the statement — never on a new line.
- Always use braces for `if`/`else`/`for`/`while` bodies, even when the body is a single line.

```js
// correct
if (isStudent) {
  console.log("enrolled");
}

// incorrect — brace on new line
if (isStudent)
{
  console.log("enrolled");
}

// incorrect — no braces
if (isStudent)
  console.log("enrolled");
```

---

## Template Literals (Strings)

- Prefer template literals over `+` concatenation when inserting variable values into a string.

```js
// preferred
console.log(`${userName} is ${userAge} years old`);

// avoid
console.log(userName + " is " + userAge + " years old");
```

---

## File Structure

1. Constants and configuration at the top
2. Variable declarations
3. Logic / main code
4. `console.log` output at the bottom
5. `README.md` required for any multi-file project

---

## Grading Deductions (per violation, applied from Week 3 forward)

| Violation | Deduction |
|-----------|-----------|
| Inconsistent indentation | -1 pt per instance (max -5) |
| Missing semicolon | -1 pt per instance (max -3) |
| Poor or single-letter variable name (not a loop counter) | -1 pt per instance |
| Missing JSDoc on a function *(enforced from Week 6)* | -2 pts per function |
| Uses `+` concatenation where a template literal fits | -1 pt per instance (max -2) |
| No README on a project | -5 pts |
| Commented-out code in submission | -2 pts |
