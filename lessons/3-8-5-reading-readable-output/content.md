## Readable Output

**What you'll learn from it:**
- That `JSON.stringify(value, null, 2)` adds line breaks and indentation
- That the second argument is a filter you almost never need
- That the third argument is how many spaces to indent by
- When to use the indented form and when to leave it off

Compact JSON is built for a program to read: no spaces, no line breaks, as small as possible. When a person is going to look at the text, you want the readable form instead. A second and third argument make `JSON.stringify` produce it.

**Try it:** Run the block and compare the shape to the compact form from the last reading.

```js live plain
const student = { name: "Marisol", age: 19 };

console.log(JSON.stringify(student, null, 2));
```

The output is spread across several lines, with each level pushed in and separated by a comma:

```
{
  "name": "Marisol",
  "age": 19
}
```

The `null` is a filter you almost never need — it is where you could name a list of properties to keep, and passing `null` means "keep them all". The `2` is how many spaces to indent by.

Use it for anything a human reads, and leave it off for anything only a program reads, because the compact form is smaller. The same data, two sizes:

**Try it:** Run the block and note that both lines describe exactly the same object.

```js live plain
const book = { title: "Eloquent JavaScript", pages: 472, tags: ["programming", "javascript"] };

console.log(JSON.stringify(book));
console.log(JSON.stringify(book, null, 2));
```

The indented form is the one you reach for while debugging, or any time the text is going to be shown to someone. The compact form is the one you store and send.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`JSON.stringify(value, null, 2)`** | The indented, human-readable form |
| **second argument** | A property filter; `null` (or omitting it) keeps every property |
| **third argument** | How many spaces to indent each level by |
| **compact form** | The default; smallest text, for programs rather than people |
| **indented form** | One property per line, for text a person will read |
