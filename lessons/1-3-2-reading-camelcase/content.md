## camelCase names that say what they hold

A variable name should tell a reader what the value means. The JavaScript habit is **camelCase**: start lowercase, and capitalize each new word — `firstName`, `totalPrice`, `isOnSale`. A good name like `unitPrice` is worth more than a comment explaining what `p` means.

**What you'll learn from it:**
- camelCase starts lowercase and capitalizes each later word.
- Descriptive names (`unitPrice`) beat short mystery names (`p`).
- The computer runs both versions the same — names are for humans.
- A clear name often removes the need for a comment.
- A value that never changes gets a different style: `UPPER_SNAKE_CASE`, like `TAX_RATE`.

**Try it:**

```js live plain
// Mystery names — what does this even calculate?
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

## Values that never change get SHOUTED

There is one other naming style in this course, and it exists to answer a question a reader
always has: *is this value going to move?*

When a value is set once and never changes again — a tax rate, the number of days in a week —
write its name in **UPPER_SNAKE_CASE**: every letter capital, with an underscore between words.

| Style | Looks like | Used for |
|------|------|------|
| camelCase | `unitPrice` | a value that can change while the program runs |
| UPPER_SNAKE_CASE | `TAX_RATE` | a value that is set once and never changes |

The capitals are a message to the person reading: *do not expect this to move.* That pairs with
`const`, which says the same thing to the computer.

```js live plain
const DAYS_IN_WEEK = 7;

let weeksWorked = 3;
let daysWorked = weeksWorked * DAYS_IN_WEEK;

console.log("Days worked: " + daysWorked);
```

Both styles are conventions, not rules the computer enforces. `TAX_RATE` and `taxRate` run
exactly the same. The capitals are there so a reader can tell the two kinds of value apart at a
glance, without reading the rest of the program.

---

## Short glossary

| Term | Meaning |
|------|---------|
| **camelCase** | Naming style: start lowercase, capitalize each later word (`firstName`) |
| **UPPER_SNAKE_CASE** | Naming style for a value that never changes: all capitals, underscores between words (`TAX_RATE`) |
| **descriptive name** | A name that tells the reader what the value means (`unitPrice`, not `p`) |
| **convention** | An agreed habit programmers follow that the computer does not enforce |
