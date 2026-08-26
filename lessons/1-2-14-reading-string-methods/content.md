## Template literals

**What you'll learn:**
- How to build strings using backtick template literals
- How `${}` embeds a variable (or any expression) directly into a string
- Why template literals are cleaner than `+` concatenation

A **template literal** uses backticks (`` ` ``) instead of quotes. Inside a template literal you can drop any variable or expression into `${}` and JavaScript fills in the value automatically.

```js
let name = "Jordan";
let score = 42;
console.log(`${name} scored ${score} points`);
// Jordan scored 42 points
```

Compare that to the older `+` concatenation style:

```js
console.log(name + " scored " + score + " points");
```

Both produce the same output, but the template literal is easier to read. In this course we lead with template literals: use them whenever you build a sentence from variables.

## String methods

**What you'll learn:**
- How to use `.length` to count characters
- How `.toUpperCase()` and `.toLowerCase()` change letter case
- How `.includes()` checks whether a string contains a word or phrase

A **method** is a built-in action you can call on a string. You write the string (or variable), then a dot, then the method name with `()`.

| Method | What it does | Example |
|--------|-------------|---------|
| `.length` | Returns the number of characters (property, no `()`) | `"hello".length` → `5` |
| `.toUpperCase()` | Returns a copy in ALL CAPS | `"hi".toUpperCase()` → `"HI"` |
| `.toLowerCase()` | Returns a copy in all lowercase | `"HI".toLowerCase()` → `"hi"` |
| `.includes(x)` | Returns `true` if the string contains `x` | `"hello".includes("ell")` → `true` |

**Try it:** Run the block and read the output. Then change `itemName` to something else and see how each line responds.

```js live plain
let itemName = "Coffee Mug";
let material = "ceramic";

let sentence = `This is a ${itemName} made of ${material}.`;
console.log(sentence);

console.log(sentence.length);
console.log(itemName.toUpperCase());
console.log(material.includes("era"));
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **template literal** | A string written with backticks that allows `${}` interpolation |
| **interpolation** | Inserting a variable's value directly into a string |
| **`${}`** | Placeholder inside a template literal; the expression inside is evaluated |
| **method** | A built-in action on a value, called with `.methodName()` |
| **`.length`** | Property (not a method): returns the number of characters in a string |
| **`.toUpperCase()`** | Returns the string in ALL CAPS |
| **`.includes(x)`** | Returns `true` if the string contains the substring `x` |
