## Data Has to Outlive the Program

**What you'll learn from it:**
- That objects, arrays and variables exist only while the program runs
- That closing the tab throws every one of them away
- That everything which stores data — files, browser storage, networks — stores **text**
- That turning an object into text the lazy way (`"" + obj`) destroys its data
- That **JSON** is the text format that keeps the structure, so the data can come back

Everything you have built so far exists only while the program runs. Close the tab and the objects, arrays and variables are gone. That is fine for a calculation and useless for a high score, a saved game, or a document.

To keep data, you have to get it out of the program and store it somewhere. Here is the catch: everything that stores data stores **text**. Files hold text. Browser storage holds text. Networks send text. So the real question is: how do you turn an object into text, and get it back without losing anything?

The naive attempt does not work. You have seen `+` turn a value into a string, so you might expect joining an object to a string to write the object out:

**Try it:** Run the block. A string does come back — but read what is in it.

```js live plain
const student = { name: "Marisol", age: 19, courses: ["CSCI 4", "MATH 105"] };

const asText = "" + student;

console.log(asText);
console.log(typeof asText);
```

The name, the age and the courses are all gone, replaced by a label saying "this was an object". There is no way back from `[object Object]` — it carries none of the data, so nothing can be rebuilt from it.

What you need is a text format that keeps the structure. That format is **JSON** (JavaScript Object Notation): a text format for representing objects, arrays, numbers, strings, booleans and `null`. It looks almost exactly like a JavaScript literal, which is where it came from, and nearly every programming language can read and write it. The rest of this module is how to convert to it and back.

`[object Object]` appearing on a page or in a log is one of the most recognizable symptoms in JavaScript, and it always means the same thing: something turned an object into text the lazy way. The moment you see it, you are looking for the place a value should have been converted properly and was not.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **in-memory data** | Values that live only while the program runs; the tab closing discards them |
| **text** | The only thing storage, files and networks can carry |
| **`[object Object]`** | What an object becomes when it is turned into text without a real conversion; all its data is lost |
| **JSON** | JavaScript Object Notation — a text format for objects, arrays, numbers, strings, booleans and `null` |
| **round trip** | Converting a value to text and back; the topic of the next readings |
