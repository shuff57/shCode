**Goal:** Tell procedural code from object-oriented code by looking at where the data lives — not by hunting for a keyword.

Both snippets below print the same line, and both are valid JavaScript. Run them and compare before reading on.

## Step 1 — Snippet A

```js live plain
let title = "JavaScript Guide";
let pages = 200;
console.log(title + " has " + pages + " pages.");
```

Two facts about one book, held in two separate variables. `console.log` — the procedure — reaches in from outside to use them. Nothing ties `title` and `pages` together except that you happened to write them next to each other.

## Step 2 — Snippet B

```js live plain
let book = { title: "JavaScript Guide", pages: 200 };
console.log(book.title + " has " + book.pages + " pages.");
```

The same two facts, bundled into one value. `book` now *is* the thing, and its data belongs to it. Rename it, pass it somewhere, put a hundred of them in a list — the two facts travel together.

## Step 3 — Which is which, and why

Snippet A is **procedural**: the data sits in separate variables, and the code reaches in from outside.

Snippet B is **object-oriented**: the same data is bundled into one value.

Here is the part worth slowing down for. Snippet B does not yet carry a method of its own — methods arrive in Chapter 5 — so it is not object-oriented because it "uses an object keyword". What marks the style is **where the data lives relative to the code that uses it**: spread across separate variables, or bundled into one value.

## Step 4 — Why it matters at scale

```js live plain
// Procedural, for three books — the pairing is only in your head
let title1 = "JavaScript Guide";  let pages1 = 200;
let title2 = "Learning Python";   let pages2 = 350;
console.log(title1 + ", " + title2);

// Object-oriented — each book keeps its own facts together
let books = [
  { title: "JavaScript Guide", pages: 200 },
  { title: "Learning Python", pages: 350 }
];
console.log(books[0].title + ", " + books[1].title);
```

With two books the top half is merely ugly. With two hundred it is unworkable — `title147` and `pages147` are related only by a naming convention nothing enforces. That is the pressure object-oriented programming exists to relieve.

## Key takeaways

- Both snippets are valid, correct JavaScript. Neither is a mistake.
- What marks the paradigm is where the data lives, not which keyword appears.
- An object with no methods is still organised the object-oriented way.
- The advantage shows up at scale, which is why Chapter 5 waits until you need it.
