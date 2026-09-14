## `JSON.parse`: Text Back to Object

**What you'll learn from it:**
- That `JSON.parse(text)` turns a JSON string back into a real value
- That numbers come back as numbers, so arithmetic works on them
- That arrays come back as real arrays with a real `length`
- That the result is an object like any other, reachable with dot access

`JSON.parse` is the other direction — a JSON string becomes a real value you can use. That is the half that makes the round trip worth having.

**Try it:** Run the block. The proof that it worked is on the second line.

```js live plain
const json = '{"name":"Marisol","age":19,"courses":["CSCI 4","MATH 105"]}';

const student = JSON.parse(json);

console.log(student.name);
console.log(student.age + 1);
console.log(student.courses[0]);
console.log(student.courses.length);
```

`student.age + 1` gives `20`, not `"191"`. The age came back as a real number, and the courses came back as a real array with a real `length`. If `parse` had handed back strings, that second line would have joined them instead of adding.

That is the difference between parsing and not. Here is the same JSON text left as text:

**Try it:** Run the block and compare the two `+ 1` lines.

```js live plain
const text = '{"n": 5}';

console.log(text + " (still just text, not usable fields)");

const v = JSON.parse(text);
console.log(v.n + 1);
```

`v.n + 1` is `6`. Parsing restores numbers as numbers, so `+` adds rather than joins. Had the JSON contained `"n": "5"` — the quoted form — it would still have been a string, because that is what you asked it to store.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`JSON.parse(text)`** | Converts a JSON string back into a JavaScript value |
| **restores types** | Numbers come back as numbers, arrays as arrays, objects as objects |
| **real array** | The parsed array has a working `length` and index access |
| **dot access** | The parsed object's properties are read the same way as any object's |
