**Goal:** Watch a `switch` handle a growing list of exact-value commands, and see why that's exactly the shape it was built for.

## Step 1: Two commands

```js live plain
let command = "north";

switch (command) {
  case "north":
    console.log("You walk north.");
    break;
  case "south":
    console.log("You walk south.");
    break;
  default:
    console.log("You cannot go that way.");
}
```

## Step 2: Add two more commands

Growing the list only ever means adding another `case`: nothing about the shape changes.

```js live plain
let command = "east";

switch (command) {
  case "north":
    console.log("You walk north.");
    break;
  case "south":
    console.log("You walk south.");
    break;
  case "east":
    console.log("You walk east.");
    break;
  case "west":
    console.log("You walk west.");
    break;
  default:
    console.log("You cannot go that way.");
}
```

## Key takeaways

- `command` is compared against a fixed set of exact strings: that's the shape `switch` is for.
- Adding a fifth or sixth direction is one more `case`, not a rewrite.
- `default` catches anything the player types that isn't a real direction.
