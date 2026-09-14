**Goal:** Convert a function that takes four positional arguments into one that takes a single options object, and see the swap bug disappear.

## Step 1: The positional version

Four arguments, all in a row. The call reads `10, 4, 6, "red"` with nothing to say which number is which.

```js live plain
function makeLabel(text, size, bold, color) {
  let label = text + " (" + size + "px";
  if (bold) {
    label = label + ", bold";
  }
  return label + ", " + color + ")";
}

console.log(makeLabel("HELLO", 14, true, "red"));
```

## Step 2: Swap two arguments by accident

Here `14` and `true` are swapped. JavaScript does not complain: `true` is a valid `size` and `14` is a truthy `bold`. The label comes out wrong.

```js live plain
function makeLabel(text, size, bold, color) {
  let label = text + " (" + size + "px";
  if (bold) {
    label = label + ", bold";
  }
  return label + ", " + color + ")";
}

console.log(makeLabel("HELLO", true, 14, "red"));
```

## Step 3: One options object

Now the function takes a single object. Each value arrives with its name, and the order in the literal carries no meaning.

```js live plain
function makeLabel(options) {
  let label = options.text + " (" + options.size + "px";
  if (options.bold) {
    label = label + ", bold";
  }
  return label + ", " + options.color + ")";
}

console.log(makeLabel({ text: "HELLO", size: 14, bold: true, color: "red" }));
```

## Step 4: Order in the literal is free

The same call with the keys written in a different order produces the same result, because the keys decide what goes where.

```js live plain
function makeLabel(options) {
  let label = options.text + " (" + options.size + "px";
  if (options.bold) {
    label = label + ", bold";
  }
  return label + ", " + options.color + ")";
}

console.log(makeLabel({ color: "red", bold: true, size: 14, text: "HELLO" }));
```

## Key takeaways

- Positional arguments match by order, so two same-typed values can silently swap.
- An options object moves each value's name to the call site.
- Because keys decide placement, the order inside the literal never matters.
- One argument, built as an object on the spot, is the style later libraries use.
