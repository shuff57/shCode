## Arithmetic operators

**What you'll learn:**
- The six arithmetic operators in JavaScript
- How JavaScript evaluates expressions left to right
- Why `+` behaves differently from every other arithmetic operator

JavaScript has six arithmetic operators:

| Operator | Name | Example | Result |
|----------|------|---------|--------|
| `+` | addition (or string join) | `3 + 4` | `7` |
| `-` | subtraction | `10 - 3` | `7` |
| `*` | multiplication | `3 * 4` | `12` |
| `/` | division | `12 / 4` | `3` |
| `%` | remainder | `10 % 3` | `1` |
| `**` | exponentiation | `2 ** 8` | `256` |

## Type coercion and the `+` trap

**What you'll learn:**
- What type coercion means
- Why `"5" + 3` gives `"53"` but `"5" - 3` gives `2`
- How to predict coercion results confidently

**Type coercion** is JavaScript automatically converting a value from one type to another behind the scenes.

The rule for `+` is: **if either side is a string, JavaScript joins them as text instead of adding.** Every other arithmetic operator (`-`, `*`, `/`, `%`, `**`) forces both sides to be numbers first.

**Try it:** Before you run the block, write down what you think each line will print. Then run it and check your predictions.

```js live console
console.log("5" + 3);
console.log("5" - 3);
console.log("10" * "2");
console.log(5 + 3 + "px");
console.log("px" + 5 + 3);
```

The last two lines are the sneaky ones. JavaScript evaluates left to right, so `5 + 3 + "px"` adds `5 + 3` first (gets `8`), then joins `8` with `"px"` (gets `"8px"`). But `"px" + 5 + 3` hits the string first, so both `5` and `3` get glued on as text.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **operator** | A symbol that performs an operation (`+`, `-`, `*`, `/`, `%`, `**`) |
| **expression** | Code that produces a value (`3 + 4`, `age * 2`) |
| **type coercion** | JavaScript automatically converting a value to a different type |
| **`+` overload** | `+` does addition for numbers but string joining when either side is a string |
| **left-to-right evaluation** | Operators of equal precedence are evaluated from left to right |
| **`%` (remainder)** | Returns the leftover after dividing: `10 % 3` is `1` |
