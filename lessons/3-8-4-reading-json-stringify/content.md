## `JSON.stringify`: Object to Text

**What you'll learn from it:**
- That `JSON.stringify(value)` converts a value into a JSON string
- That the result is a string whatever the input was — object, array or number
- That every key comes out in double quotes, which a JavaScript literal does not require
- That strings use double quotes only, and the compact form has no spaces or line breaks
- That nested values survive the conversion

`JSON.stringify` converts a value into a JSON string. Where `"" + object` lost everything, `JSON.stringify` keeps it all:

**Try it:** Run the block and compare the two lines to the object you wrote.

```js live plain
const student = { name: "Marisol", age: 19, courses: ["CSCI 4", "MATH 105"] };

const json = JSON.stringify(student);

console.log(json);
console.log(typeof json);
```

Nothing was lost. Every property is there, the nested array survived, and the whole thing is now a single string you can store or send.

Look closely at what changed from the JavaScript literal you typed:

- Every **key** is in double quotes — `"name"`, not `name`. JSON requires this; JavaScript object literals do not.
- Strings use **double** quotes only. Single quotes are not valid JSON.
- There are no spaces or line breaks, because none are needed.

Arrays convert too, not just objects, and numbers convert as themselves:

**Try it:** Run the block and notice that the result of the first line is a string, while the others are numbers.

```js live plain
const scores = [1, 2, 3];

console.log(JSON.stringify(scores));
console.log(JSON.stringify(42));
console.log(JSON.stringify("hello"));
```

Whatever you hand it, the result is a string. `JSON.stringify(scores)` gives `"[1,2,3]"`, not the array `[1, 2, 3]`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`JSON.stringify(value)`** | Converts a JavaScript value into a JSON-formatted string |
| **JSON string** | The text result; always a string, whatever the input type was |
| **double quotes** | JSON uses them for every key and every string; single quotes are invalid |
| **compact form** | The default output: no spaces or line breaks, because none are needed |
