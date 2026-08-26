**Goal:** Combine a `for` loop with an `if/else if` inside it to respond differently to each item in an array.

## Step 1: Loop over a menu array

Here is a small array of menu choices. The `for` loop visits each one using an index `i`. Run it to confirm every item prints.

```js live plain
let menu = ["start", "help", "quit"];

for (let i = 0; i < menu.length; i++) {
  console.log("Item " + i + ": " + menu[i]);
}
```

## Step 2: Add if/else if to respond to each choice

Now put an `if/else if/else` inside the loop. The loop handles the repetition; the conditional handles the decision. Each item gets its own response.

```js live plain
let menu = ["start", "help", "quit"];

for (let i = 0; i < menu.length; i++) {
  let choice = menu[i];

  if (choice === "start") {
    console.log("Starting the program...");
  } else if (choice === "help") {
    console.log("Showing help text.");
  } else if (choice === "quit") {
    console.log("Goodbye!");
  } else {
    console.log("Unknown option: " + choice);
  }
}
```

## Step 3: Try an unknown option

Add `"settings"` to the menu array. Because there is no matching case, it falls through to the `else` and prints the unknown-option message.

```js live plain
let menu = ["start", "help", "settings", "quit"];

for (let i = 0; i < menu.length; i++) {
  let choice = menu[i];

  if (choice === "start") {
    console.log("Starting the program...");
  } else if (choice === "help") {
    console.log("Showing help text.");
  } else if (choice === "quit") {
    console.log("Goodbye!");
  } else {
    console.log("Unknown option: " + choice);
  }
}
```

## Key takeaways

- A loop and a conditional are independent tools: putting one inside the other is how real programs work.
- The loop controls **how many times** you repeat; the `if` controls **what happens** on each pass.
- `menu.length` keeps the loop correct even if you add or remove items from the array.
- The `else` branch is a safety net for values you did not anticipate.
