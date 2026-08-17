**Goal:** Practice telling a good ternary apart from a misused one, then rewrite the misused one.

## Step 1 — A good use of ?

`greeting` is a single value picked from two options. This is exactly what `?` is for — no rewrite needed.

```js live plain
let hour = 9;
let greeting = (hour < 12) ? "Good morning" : "Good afternoon";
console.log(greeting);
```

## Step 2 — A misused ternary

This one uses `?` to choose between two `console.log` calls instead of a value. It runs, but it is doing two different *actions*, not picking a value.

```js live plain
let loggedIn = "yes";

(loggedIn === "yes") ? console.log("Welcome back!") : console.log("Please log in.");
```

## Step 3 — Rewrite it as if/else

Same logic, but now each branch is a full statement on its own line. This is easier to scan and easier to extend later if a branch needs more than one line.

```js live plain
let loggedIn = "yes";

if (loggedIn === "yes") {
  console.log("Welcome back!");
} else {
  console.log("Please log in.");
}
```

## Key takeaways

- A ternary whose branches are both `console.log` calls (or any action with no value used) is a sign it should be an `if`/`else`.
- The test is not "does it run" — both versions run. The test is "am I picking a value, or running an action."
- Rewriting doesn't change behavior; it changes how easy the code is to read and extend.
