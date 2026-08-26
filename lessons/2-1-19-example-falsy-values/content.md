**Goal:** See a falsy value take the `else` branch even though it looks like ordinary data, not a boolean.

## Step 1: An empty string is falsy

`name` holds an empty string. It never went through a comparison: it's being tested directly.

```js live plain
let name = "";

if (name) {
  console.log("Hello, " + name);
} else {
  console.log("No name entered.");
}
```

## Step 2: Give it a value

Change `name` to `"Sam"` and run again. Any non-empty string is truthy, so the `if` branch runs this time.

```js live plain
let name = "Sam";

if (name) {
  console.log("Hello, " + name);
} else {
  console.log("No name entered.");
}
```

## Step 3: 0 is falsy, even as a real count

`itemsInCart` is a real, meaningful number, but `0` is still one of the six falsy values.

```js live plain
let itemsInCart = 0;

if (itemsInCart) {
  console.log("You have items in your cart.");
} else {
  console.log("Your cart is empty.");
}
```

## Key takeaways

- `if` converts its condition to a boolean: the value doesn't have to already be `true`/`false`.
- `""` and `0` are falsy even though they're ordinary, meaningful data, not error values.
- Testing a variable directly (`if (name)`) is a shortcut for "is this falsy or truthy," not a shortcut for "does this equal something specific."
- When in doubt, ask: is this one of the six falsy values? If not, it's truthy.
