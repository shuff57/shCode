## camelCase names that say what they hold

A variable name should tell a reader what the value means. The JavaScript habit is **camelCase**: start lowercase, and capitalize each new word: `firstName`, `totalPrice`, `isOnSale`. A good name like `unitPrice` is worth more than a comment explaining what `p` means.

**What you'll learn from it:**
- camelCase starts lowercase and capitalizes each later word.
- Descriptive names (`unitPrice`) beat short mystery names (`p`).
- The computer runs both versions the same: names are for humans.
- A clear name often removes the need for a comment.
- A value that never changes is written the same way — `const` is what marks it.

**Try it:**

```js live plain
// Mystery names: what does this even calculate?
let p = 29.99;
let q = 3;
let t = p * q;
console.log(t);

// Same math, readable names
let unitPrice = 29.99;
let quantity = 3;
let subtotal = unitPrice * quantity;
console.log("Subtotal: $" + subtotal);
```

## Values that never change say so with `const`

There is a question a reader always has about a value: *is this one going to move?*

A value that is set once and never changes again — a tax rate, the number of days in a week —
is declared with **`const`** instead of `let`. The name itself stays in ordinary camelCase. The
keyword in front of it is what carries the message.

| Keyword | Looks like | Used for |
|------|------|------|
| `let` | `let unitPrice = 29.99;` | a value that can change while the program runs |
| `const` | `const taxRate = 0.0725;` | a value that is set once and never changes |

`const` speaks to both audiences at once. The reader sees it in the first word of the line, and
the computer refuses to let the value be reassigned.

```js live plain
const daysInWeek = 7;

let weeksWorked = 3;
let daysWorked = weeksWorked * daysInWeek;

console.log("Days worked: " + daysWorked);
```

So one naming style covers every value in this course: `taxRate` and `daysInWeek` are written
exactly like `unitPrice`, and there is no second style to remember. What tells the two kinds of
value apart is the keyword, not the spelling — and unlike a naming habit, the keyword is one the
computer actually enforces.

---

## Short glossary

| Term | Meaning |
|------|---------|
| **camelCase** | Naming style: start lowercase, capitalize each later word (`firstName`) |
| **`const`** | Declares a value that is set once and never changes (`const taxRate = 0.0725;`) |
| **descriptive name** | A name that tells the reader what the value means (`unitPrice`, not `p`) |
| **convention** | An agreed habit programmers follow that the computer does not enforce |
