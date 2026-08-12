## Splitting Text into Lines (.split)

**What you'll learn:**
- How `.split(separator)` breaks one string into an array of smaller strings
- Why `"\n"` (the newline character) is the separator for splitting lines
- How this is exactly what happens when a program reads a text file
- How to loop over the resulting array and print each line with its number

When a program reads a text file, the entire contents arrive as **one big string**. The newlines between lines are just the character `"\n"` buried in the middle of that string. To work with individual lines, you use `.split("\n")`:

```js
let lines = fileContents.split("\n");
```

That one call turns the string into an **array** — one element per line. From there you already know what to do: loop over it with `for` or `for...of`.

**A preview of File I/O:** In a later unit you will use `fs.readFileSync()` (Node.js) to load a real file. It returns a string, and the very first thing most programs do with it is `.split("\n")` — the same pattern you are about to practice below.

**Try it:** The block simulates a file by storing multiple lines in a template literal, then splits and numbers each line.

```js live console
let fileContents = `Alice,90
Bob,75
Carol,88
Dan,95`;

let lines = fileContents.split("\n");

console.log("Total lines:", lines.length);

for (let i = 0; i < lines.length; i++) {
    console.log("Line " + (i + 1) + ": " + lines[i]);
}
```

The template literal (backtick string) lets you type a real newline in your source code, so `split("\n")` finds those breaks and cuts the string there.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`.split(sep)`** | String method that cuts the string at every `sep` and returns an array of pieces |
| **`"\n"`** | The newline character — the invisible separator between lines in a text file |
| **template literal** | A string in backticks (`` ` ``) that can span multiple lines and embed real newlines |
| **File I/O** | Reading from or writing to a file; `.split("\n")` is the standard first step after reading |
| **line number** | Human-readable position of a line; `i + 1` when the index `i` starts at `0` |
