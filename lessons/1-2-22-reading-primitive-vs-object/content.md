## Seven hold one thing. One holds many.

> **Definition 1.2.7: Primitive vs object types.** All the types met so far: `number`, `string`, `boolean`, `null`, `undefined`, `bigint` and `symbol`: are **primitive**. A primitive value holds only one thing: a single number, a single piece of text, a single true/false. The **`object`** type is different: objects store collections of data and more complex entities.

That is the one real division in the type system. Seven primitives and one object type, which is why the count of eight breaks down as 7 + 1 rather than 8 of a kind.

The **`symbol`** type is the odd one out among the primitives: it creates unique identifiers, used almost entirely for advanced object work. You will meet it properly alongside objects. For now, know it exists and that it is a primitive.

Objects get a full treatment later in the course. This lesson only needs you to see the shape: curly braces, and named pieces of data inside.

**What you'll learn from it:**
- Seven of the eight types are primitive: each value holds one single thing.
- `object` is the only non-primitive type; it holds a collection.
- Curly braces `{ }` create an object.
- `symbol` is a primitive for unique identifiers; it arrives with objects later.

**Try it:**

```js live plain
// primitives: one thing each
let pages = 200;
let title = "JavaScript Guide";
let inStock = true;

console.log(pages, title, inStock);

// an object: several things, one value
let book = { title: "JavaScript Guide", pages: 200 };

console.log(book);
console.log(book.title);
console.log(typeof book);   // "object"
```

`book` holds two pieces of data and is still **one value**. You can hand it to something, store it in a list, or copy it, and the title and the page count travel together. That is the whole reason the object type exists, and, as §1.4 pointed out, the beginning of the object-oriented paradigm.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **primitive type** | A type whose values hold only a single thing |
| **object** | The one non-primitive type; holds a collection of data |
| **property** | A named piece of data inside an object: `book.pages` |
| **`symbol`** | A primitive for unique identifiers, used with advanced object work |
