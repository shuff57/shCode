**Goal:** Fix the dead-case bug by changing the case values to match the value's real type, string for string.

## Step 1: See the dead code

`answer` is the string `"3"`. Every numeric case fails, and dead code hides in plain sight.

```js live plain
let answer = "3";

switch (answer) {
  case 1:
    console.log("You chose one.");
    break;
  case 2:
    console.log("You chose two.");
    break;
  case 3:
    console.log("You chose three.");
    break;
  default:
    console.log("Not a valid choice.");
}
```

## Step 2: Make the cases strings

`answer` really is a string: it probably came from a form field or a prompt. So make the cases strings too, instead of changing `answer`.

```js live plain
let answer = "3";

switch (answer) {
  case "1":
    console.log("You chose one.");
    break;
  case "2":
    console.log("You chose two.");
    break;
  case "3":
    console.log("You chose three.");
    break;
  default:
    console.log("Not a valid choice.");
}
```

## Key takeaways

- Dead code doesn't error: it just silently never runs, which is why it's dangerous.
- Fix 1 changes the `case` values, not the switched value, when you know the value is really supposed to be text.
- This only works if the value is *always* a string. If it might arrive as either a string or a number, Fix 2 (the next lesson) is the safer choice.
