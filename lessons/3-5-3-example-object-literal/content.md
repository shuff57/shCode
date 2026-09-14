**Goal:** Turn a pile of loose variables into one object literal, then read its properties back out.

## Step 1: The loose version

Three variables, each holding one fact about the same book. Run it and notice that nothing links them.

```js live plain
const title = "Eloquent JavaScript";
const author = "Haverbeke";
const pages = 472;

console.log(title + " by " + author + ", " + pages + " pages");
```

## Step 2: Group them into one object

Move all three facts inside braces. Now the facts have names, and the whole thing travels as one value.

```js live plain
const book = {
  title: "Eloquent JavaScript",
  author: "Haverbeke",
  pages: 472
};

console.log(book);
```

## Step 3: Read each property back out

A dot followed by the property name reads one value. The key you wrote in the literal is the name you use after the dot.

```js live plain
const book = {
  title: "Eloquent JavaScript",
  author: "Haverbeke",
  pages: 472
};

console.log(book.title + " by " + book.author + ", " + book.pages + " pages");
```

## Key takeaways

- An object literal groups related facts under one variable name.
- Each entry is a `key: value` pair; commas separate the pairs.
- `object.key` reads the value stored under that key.
- The keys, not the order, give each value its meaning.
