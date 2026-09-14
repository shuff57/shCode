## Reading a Nested Object

**What you'll learn:**
- That a property's value can itself be an object
- How to read a chain like `student.address.city` left to right

A property's value can be any type — including another object. This is where objects start describing real data.

**Try it:** Read a chain by taking one step at a time.

```js live plain
const student = {
  name: "Marisol",
  address: {
    city: "Chico",
    state: "CA"
  },
  courses: ["CSCI 4", "MATH 105"]
};

console.log(student.address.city);
console.log(student.courses[0]);
console.log(student.courses.length);
```

Read `student.address.city` left to right: take `student`, get its `address`, get that object's `city`. Each step is the same operation applied to whatever the previous step produced.

## An Array of Objects

**What you'll learn:**
- That an array can hold objects, one per record
- How `students[i].name` picks one object and reads one field

The reverse nesting — an **array of objects** — is the single most common shape in real programs.

**Try it:** Loop the array with an index, pick each object, and read its fields.

```js live plain
const students = [
  { name: "Marisol", grade: 92 },
  { name: "Dev", grade: 78 },
  { name: "Priya", grade: 85 }
];

for (let i = 0; i < students.length; i++) {
  console.log(students[i].name + ": " + students[i].grade);
}
```

`students[i]` picks one object out of the array; `.name` reads a property of that object. Every table of records — rows from a spreadsheet, items in a cart — has this shape.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **nested object** | An object stored as the value of another object's property |
| **access chain** | `a.b.c` applied one step at a time, each on the previous result |
| **array of objects** | A list where each element is a record; read with `arr[i].field` |
| **`.length`** | On the nested array, the number of elements it holds |
| **record** | One object that stands for one thing — a student, an item, a row |
