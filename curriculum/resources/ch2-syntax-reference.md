# Chapter 2 Syntax Reference — Control Flow

*Print this page. One side of A4. Closed-book test aid.*

---

## Variables & Types

```js
let name = "Ada";        // mutable
const PI = 3.14159;      // immutable
let count;               // undefined
let isDone = false;      // boolean
let name = "Ada";        // string
let count = 42;          // number
let empty = null;        // null
let notSet;              // undefined
```

**UPPER_SNAKE_CASE** for constants that never change: `const MAX_SIZE = 100;`

**camelCase** for variables: `let itemCount = 0;`

---

## Operators

| Operator | Meaning | Example |
|---|---|---|
| `+` | add / concat | `2 + 3 = 5`, `"a" + "b" = "ab"` |
| `-` | subtract | `5 - 2 = 3` |
| `*` | multiply | `3 * 4 = 12` |
| `/` | divide | `10 / 2 = 5` |
| `%` | remainder | `10 % 3 = 1` |
| `**` | exponent | `2 ** 3 = 8` |
| `+=` | add assign | `x += 1` same as `x = x + 1` |
| `-=` | subtract assign | `x -= 1` |
| `*=` | multiply assign | `x *= 2` |
| `/=` | divide assign | `x /= 2` |

---

## Comparison (strict equality preferred)

| Operator | Meaning | Note |
|---|---|---|
| `===` | strict equal | `5 === 5` true, `5 === "5"` false |
| `!==` | strict not equal | `5 !== "5"` true |
| `==` | loose equal | **avoid** — coerces types |
| `!=` | loose not equal | **avoid** |
| `>` `<` `>=` `<=` | ordering | numbers only |

**Truthiness traps:**
- `0`, `""`, `null`, `undefined`, `NaN`, `false` → falsy
- Everything else → truthy (including `"0"`, `"false"`, `[]`, `{}`)

---

## Logical

| Operator | Meaning | Short-circuits? |
|---|---|---|
| `&&` | and | yes — stops at first falsy |
| `||` | or | yes — stops at first truthy |
| `!` | not | — |

---

## Conditionals

```js
if (score >= 90) {
  console.log("A");
} else if (score >= 80) {
  console.log("B");
} else if (score >= 70) {
  console.log("C");
} else {
  console.log("F");
}

// ternary
const grade = score >= 60 ? "pass" : "fail";
```

---

## Loops

### `for` (known count)

```js
for (let i = 0; i < 10; i++) {
  console.log(i);  // 0..9
}

for (let i = 2; i <= 10; i += 2) {
  console.log(i);  // 2,4,6,8,10
}
```

### `while` (unknown count)

```js
let i = 0;
while (i < 5) {
  console.log(i);
  i++;  // must update inside!
}
```

### `do...while` (runs at least once)

```js
let input;
do {
  input = prompt("Enter a number:");
} while (isNaN(input));
```

### Loop control

| Keyword | Effect |
|---|---|
| `break` | exit loop immediately |
| `continue` | skip rest of this iteration, go to next |

**`continue` in `while` skips the increment!** Put increment *before* `continue`, or use `for`.

```js
// WRONG -- infinite loop
while (i < 5) {
  if (i % 2 === 0) continue;
  i++;
}

// CORRECT
while (i < 5) {
  i++;
  if (i % 2 === 0) continue;
  console.log(i);
}
```

### Nested loops

```js
for (let row = 1; row <= 3; row++) {
  for (let col = 1; col <= 3; col++) {
    console.log(row + "-" + col);
  }
}
```

---

## Switch

```js
switch (day) {
  case "Mon":
  case "Tue":
  case "Wed":
  case "Thu":
  case "Fri":
    console.log("Weekday");
    break;
  case "Sat":
  case "Sun":
    console.log("Weekend");
    break;
  default:
    console.log("Invalid");
}
```

- `switch` uses **strict equality** (`===`)
- `case` values are compared with `===`
- `break` required after each case (except `default`)
- Group cases by stacking: `case "A": case "B":`

---

## Error Handling

```js
try {
  const result = riskyOperation();
  console.log(result);
} catch (err) {
  console.log("Error: " + err.message);
} finally {
  console.log("Cleanup runs either way");
}

// Throw your own
if (age < 0) {
  throw new Error("Age cannot be negative");
}
```

| Error type | When it happens |
|---|---|
| `SyntaxError` | code not valid JS (missing `}`, etc.) |
| `ReferenceError` | variable not declared |
| `TypeError` | wrong type (e.g., `const` reassignment) |
| `RangeError` | value out of range |

---

## Console

```js
console.log("Hello");           // print with newline
console.log(`Score: ${score}`); // template literal
console.log(typeof 42);         // "number"
console.log(typeof "hello");    // "string"
console.log(typeof true);       // "boolean"
console.log(typeof null);       // "object" (historical bug)
console.log(typeof NaN);        // "number"
```

---

## Flowchart Shapes (Appendix D)

| Shape | Mermaid | Means | Released |
|---|---|---|---|
| Oval | `A([Start])` | Start / End | §1.5 |
| Rectangle | `A[do it]` | Process / action | §1.5 |
| Diamond | `A{cond}` | Decision (2 exits) | §1.5 |
| Parallelogram | `A[/in/]` | Input / Output | §1.5 |
| **Hexagon** | `A{{i=1 to 9}}` | **Loop setup** | **§2.2** |
| Double-rail | `A[[fn()]]` | Function call | §3.1 |
| Connector | `A((A))` | Jump / page break | §4.1 |
| Comment | `A>note]` | Annotation | §4.1 |

**Eight structural checks** (Appendix D §D.3): one-start, has-end, all-labeled, no-orphans, decision-two-exits, decision-labeled, connector-pairs, reaches-end.

---

## Key Differences: Ch 1 → Ch 2

| Ch 1 | Ch 2 |
|---|---|
| Straight-line code | Loops + decisions |
| `if` computes boolean, prints it | `if` / `else if` / `else` with real branches |
| Three shapes (oval, rect, diamond) | **+ hexagon, parallelogram** |
| Pseudocode only | Real JS code |
| Straight line | Loops + nested loops + `switch` + `try`/`catch` |

---

*End of reference. Good luck on the test.*