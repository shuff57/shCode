**Goal:** Write an arrow that takes nothing, and see why the empty parentheses cannot be dropped.

## Step 1: A function with no parameters

`shout` takes nothing and returns a fixed string. With zero parameters, the empty `()` is required.

```js live plain
const shout = () => "HEY!";

console.log(shout());
```

It prints `HEY!`. The `()` is not optional here — without it there would be nothing to the left of the arrow.

## Step 2: See why the parentheses are required

Drop the empty parentheses and the line does not even parse:

```js
const broken = => "HEY!";
```

`=>` with nothing before it is a syntax error. Empty parentheses are the way to say "this function takes no arguments", and there is no shorthand for them.

## Step 3: A zero-parameter arrow with a block body

With braces, the automatic return stops, so `return` is written out.

```js live plain
const greeting = () => {
  const word = "HEY";
  return word + "!";
};

console.log(greeting());
```

Same result — `HEY!` — but this version needed the `return`.

## Key takeaways

- A zero-parameter arrow requires empty `()` before the `=>`.
- `=> "HEY!"` with nothing on the left is a syntax error.
- The parentheses rule: optional for exactly one parameter, required otherwise.
- With braces, the block needs an explicit `return` even when it takes no parameters.
