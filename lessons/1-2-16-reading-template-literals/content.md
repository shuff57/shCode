## `${...}` puts a value inside the text

Inside backticks, anything you write between `${` and `}` is **evaluated**, and the result becomes part of the string. That is the entire feature.

You can put a variable in there:

```js
`Hello, ${name}!`
```

Or a calculation — anything that produces a value:

```js
`the result is ${1 + 2}`
```

A string written with backticks is called a **template literal**, and this is why it exists. Compare it to gluing pieces together with `+`:

| | |
|---|---|
| With `+` | `"Hello, " + name + "! You have " + count + " messages."` |
| With `${}` | `` `Hello, ${name}! You have ${count} messages.` `` |

Both produce the same string. The second one you can read.

**What you'll learn from it:**
- `${...}` works only inside backticks.
- Whatever is inside is evaluated, and the result is inserted.
- A variable or a whole expression both work — `${1 + 2}` gives `3`.
- Template literals are far easier to read than joining with `+`.

**Try it:**

```js live plain
let name = "John";

console.log( `Hello, ${name}!` );
console.log( `the result is ${1 + 2}` );

let price = 4;
let qty = 3;
console.log( `${qty} at $${price} each is $${price * qty}` );

// double quotes do nothing with it
console.log( "the result is ${1 + 2}" );
```

The last line is the check. Double quotes printed `${1 + 2}` as literal characters — they do not evaluate anything. If your `${...}` shows up in the output as text, you used the wrong quote mark, and that is by far the most common way this goes wrong.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **template literal** | A string written with backticks, which can embed values |
| **`${...}`** | The embedding syntax — the expression inside is evaluated |
| **expression** | Anything that produces a value: `name`, `1 + 2`, `price * qty` |
| **concatenation** | Joining strings with `+` — what template literals replace |
