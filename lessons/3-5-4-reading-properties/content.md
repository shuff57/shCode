## Reading a Property

**What you'll learn:**
- How a dot reads the property spelled exactly after it
- That reading a property that is not there gives `undefined`, not an error

A dot and a name read a property. `book.title` means "the `title` property of `book`".

**Try it:** Read two properties and print them.

```js live plain
const book = {
  title: "Eloquent JavaScript",
  pages: 472
};

console.log(book.title);
console.log(book.pages);
```

Reading a property that does not exist is **not** an error — it gives `undefined`. A misspelled property name fails silently, which is worth remembering:

```js live plain
const student = { name: "Marisol", age: 19 };

console.log(student.name);
console.log(student.nmae);
```

Compare that with an undeclared *variable*, which throws a `ReferenceError` you cannot miss. When a value is mysteriously `undefined`, check the spelling of the property name first.

## Changing, Adding, and Removing

**What you'll learn:**
- How assignment changes an existing property
- How assignment to a missing name adds one
- How `delete` removes a property

Assignment to an existing property overwrites it. Assignment to a name that is not there **creates** the property — both use the same dot form.

```js live plain
const book = {
  title: "Eloquent JavaScript",
  pages: 472
};

book.pages = 480;
book.author = "Haverbeke";

console.log(book);
```

Note that `book` was declared with `const` and both assignments worked. `const` stops `book` being pointed at a *different* object; it does not freeze the object's contents.

`delete` removes a property entirely, and reading it afterwards gives `undefined`:

```js live plain
const book = { title: "Eloquent JavaScript", pages: 472 };

delete book.pages;

console.log(book);
console.log(book.pages);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **dot notation** | `object.name` reads the property spelled exactly like the text after the dot |
| **assignment to a property** | `object.name = value` changes an existing property or creates a new one |
| **`delete`** | Removes a property entirely: `delete object.name` |
| **missing property** | Reading one gives `undefined`, never an error |
| **`const` on an object** | Prevents rebinding the variable, not changing the object's properties |
