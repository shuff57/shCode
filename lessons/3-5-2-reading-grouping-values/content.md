## Why Group Related Values

**What you'll learn:**
- The problem with describing one thing using separate variables
- Why an object keeps related facts together
- The difference between an array (a numbered list) and an object (a named record)

An **array** answers "which position?". An **object** answers "which name?". When the values are different facts about one thing — a name, an age, a city — grouping them under one name is clearer than three loose variables.

**Try it:** Run the block. Three variables describe one student; nothing in the program says they belong together.

```js live plain
const studentName = "Marisol";
const studentAge = 19;
const studentCity = "Chico";

console.log(studentName + ", " + studentAge + ", from " + studentCity);
```

An **object** groups those same three values into a single value:

```js live plain
const student = {
  name: "Marisol",
  age: 19,
  city: "Chico"
};

console.log(student.name + ", " + student.age + ", from " + student.city);
```

The braces make an **object literal**. Inside, each line is a `key: value` pair — the key on the left names the value on the right, and the pairs are separated by commas.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **object** | A value holding a collection of named values |
| **object literal** | The `{ key: value, ... }` syntax that creates an object |
| **property** | One `key: value` pair belonging to an object |
| **key** | The name of a property; always a string, even when written without quotes |
| **array vs object** | An array stores interchangeable items by position; an object stores distinct facts by name |
