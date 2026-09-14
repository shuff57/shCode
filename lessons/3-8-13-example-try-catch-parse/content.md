**Goal:** Watch `JSON.parse` throw on malformed text, then wrap it so a bad string becomes a usable fallback instead of a stopped program.

## Step 1: Parse without a guard

The string below is not valid JSON. Run this and read what happens.

```js live plain
const data = JSON.parse("{ this is not json }");
console.log(data);
```

Nothing prints — the call throws a `SyntaxError`, and with no `try...catch` around it the whole run is over. Section 2.5 is the reason that matters: an error is not a value, it stops the program.

## Step 2: Wrap it in `try...catch`

Put the parse inside a `try` and catch the error. Now the failure is a branch, not an ending.

```js live plain
try {
  const data = JSON.parse("{ this is not json }");
  console.log(data);
} catch (err) {
  console.log("Could not read the saved data.");
  console.log(err.name);
}
```

You see `Could not read the saved data.` and then `SyntaxError`. The program carried on, because the `catch` took the throw.

## Step 3: Catch with a usable fallback

Merely surviving is not the same as handling. A good `catch` returns a value the rest of the program can use — here, sensible defaults.

```js live plain
function loadSettings(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return { theme: "light", fontSize: 14 };
  }
}

console.log(loadSettings('{"theme":"dark","fontSize":18}'));
console.log(loadSettings("corrupted!!"));
```

Good data passes through and is used. Bad data falls back to the defaults. Either way the caller gets an object, so the line that uses `settings.theme` does not have to check whether a value arrived.

## Step 4: The same function, both paths

Run one more call with genuinely malformed text to confirm the fallback, then one with valid text to confirm the parse.

```js live plain
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return "unreadable";
  }
}

console.log(safeParse('{"ok":true}'));
console.log(safeParse("{oops"));
```

The first call returns the parsed object; the second returns `"unreadable"`. That is the shape every load function in this module uses.

## Key takeaways

- `JSON.parse` throws a `SyntaxError` on text that is not valid JSON.
- Without a `try...catch`, that throw stops the program.
- A `catch` that returns `undefined` only postpones the crash; return a usable value.
- Defaults are the standard fallback, because the caller can keep working with them.
- Text you loaded is text you did not write, so guard every parse of it.
