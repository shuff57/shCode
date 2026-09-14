**Goal:** See the difference between JSON that a person can read and the parts of an object that do not survive the trip to text.

## Step 1: The readable form

The second and third arguments to `JSON.stringify` turn compact text into output a person can read. Run this and look at the shape.

```js live plain
const book = { title: "Eloquent JavaScript", pages: 472, tags: ["programming", "javascript"] };

console.log(JSON.stringify(book, null, 2));
```

The `2` is the number of spaces to indent each level. The `null` is the unused filter; you pass it only to reach the third argument.

## Step 2: The same object, compact

Drop those two arguments and the same object comes out on one line, with no spaces. Nothing changed but the formatting.

```js live plain
const book = { title: "Eloquent JavaScript", pages: 472, tags: ["programming", "javascript"] };

console.log(JSON.stringify(book));
console.log(JSON.stringify(book, null, 2));
```

Use the indented form when a person will read the text, and the compact form when only a program will.

## Step 3: What a method does

Now the lossy half. An object can carry a method — a property whose value is a function. JSON has no way to represent a function, so the method is dropped.

```js live plain
const counter = {
  count: 5,
  describe: function () {
    return "I am a counter.";
  }
};

console.log(JSON.stringify(counter));
```

The output is `{"count":5}`. No error, no warning — the method is simply not there.

## Step 4: `undefined` goes the same way

An `undefined` value is not representable either, so it disappears alongside the function.

```js live plain
const settings = {
  theme: "dark",
  fontSize: undefined,
  level: 3
};

console.log(JSON.stringify(settings));
```

Only `theme` and `level` survive. This is not a bug: JSON stores **data**, not behaviour. A method and an `undefined` value are exactly the two things JSON was never able to carry.

## Key takeaways

- `JSON.stringify(value, null, 2)` indents the output for a person; the compact form is for programs.
- JSON can represent objects, arrays, numbers, strings, booleans and `null` — and nothing else.
- A function property is dropped silently, with no error.
- An `undefined` value is dropped the same way.
- Saving and loading data means saving and loading data — behaviour has to be rebuilt by the program.
