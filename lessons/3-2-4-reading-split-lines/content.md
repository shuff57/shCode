## Splitting Text into Lines (.split)

**What you'll learn:**
- How `.split(separator)` breaks one string into an array of smaller strings
- Why `"\n"` (the newline character) is the separator for splitting lines
- Why multi-line text always arrives as one string, and why `.split("\n")` is the usual first step
- How to loop over the resulting array and print each line with its number
- How `.join(separator)` goes the other way, gluing an array back into one string

When a program receives multi-line text (typed into a prompt, or fetched from somewhere else), the entire contents arrive as **one big string**. The newlines between lines are just the character `"\n"` buried in the middle of that string. To work with individual lines, you use `.split("\n")`:

```js
let lines = fileContents.split("\n");
```

That one call turns the string into an **array**: one element per line. From there you already know what to do: loop over it with `for` or `for...of`.

**Why this matters:** Text that comes from a prompt, or is fetched from elsewhere, arrives as one string, and the usual first step is `.split("\n")` to get the lines. The block below uses that exact pattern.

**Try it:** The block simulates multi-line text by storing multiple lines in a template literal, then splits and numbers each line.

```js live plain
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

### The other direction: `.join()`

`.join()` goes the other way. It glues an array back into one string, with whatever you put between the pieces:

```js live plain
let fruits = ["apple", "banana", "cherry"];

console.log(fruits.join(", "));
console.log(fruits.join(" and "));
console.log(fruits.join(""));
```

Neither method changes what it was called on. `.split()` leaves the string alone and hands back a new array; `.join()` leaves the array alone and hands back a new string. Together they are the usual way to work on text: split it into pieces, do array work on the pieces, and join the result back.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`.split(sep)`** | String method that cuts the string at every `sep` and returns an array of pieces |
| **`.join(sep)`** | Array method that glues the items into one string, with `sep` between them |
| **`"\n"`** | The newline character: the invisible separator between lines of text |
| **template literal** | A string in backticks (`` ` ``) that can span multiple lines and embed real newlines |
| **line number** | Human-readable position of a line; `i + 1` when the index `i` starts at `0` |
