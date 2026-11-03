## A saved number comes back a number

**Read before attempting `6.5.7 Worked Example: Load and Display a High Score`.**

In 3.8.15 the browser's own `localStorage` gave back text whatever you saved: save `1200`, read back `"1200"`, add `1` and get `"12001"`. moSHion's `storeItem` and `getItem` do not do that. `storeItem` writes your value down as JSON, the text format you met in 3.8.4, which remembers whether a value was a number, text, or `true`/`false`. `getItem` turns it back. Save the number `250` and `getItem` gives you the number `250`.

**Try it:** the sketch saves the number `5` and the text `'5'` (in quotes), then adds `1` to each value it reads back. The third line wraps the text in `Number()` first.

```js live
function setup() {
  new Canvas(400, 200);
  storeItem('n', 5);
  storeItem('t', '5');
}

function draw() {
  background('#222');
  if (frameCount === 1) {
    console.log('saved the number 5, plus 1:', getItem('n') + 1);          // 6
    console.log("saved the text '5', plus 1:", getItem('t') + 1);          // 51
    console.log("Number() of the text, plus 1:", Number(getItem('t')) + 1); // 6
  }
  text('Open the console to see all three results.', 10, 20);
}
```

**What you'll see:** `6`, then `51`, then `6`. The number came back a number, so `+ 1` added. The text came back text, so `+ 1` joined the two, the same trap as 3.8.15. `Number()` turned the text into a number and the addition worked again.

---

## When you still get text

`getItem` gives back exactly the type you saved, so you get text back when text is what went in:

- You saved a value in quotes, like `storeItem('highScore', '250')`.
- You saved a value that started life as text, like the answer to a `prompt(...)`. That is why 3.1.9 wrapped `prompt(...)` in `Number(...)`.

Two pieces of text compare letter by letter, which gives wrong answers for numbers:

```js
'9' > '100'                  // true: the character '9' comes after '1'
Number('9') > Number('100')  // false: 9 is less than 100
```

---

## The first run: `|| 0`

On the very first run nothing has been saved yet, so `getItem('highScore')` returns `null`. Shown on screen, that reads `Best: null`. The `||` fallback gives you a clean starting value instead:

```js
let highScore = getItem('highScore') || 0;
```

`null` is falsy, so `|| 0` picks `0`. Once a number has been saved, `getItem` returns it and `||` keeps it.

---

## The safety net: `Number(getItem(key)) || 0`

The worked examples in this unit write the load one word longer:

```js
let highScore = Number(getItem('highScore')) || 0;
```

When you saved a number yourself, `Number()` changes nothing: `Number(250)` is `250`. It is a safety net, so one line copes with everything the slot could hold:

```js
Number(getItem('highScore')) || 0
// nothing saved yet:    Number(null)  → 0   → falsy  → 0
// you saved 250:        Number(250)   → 250 → truthy → 250
// someone saved '250':  Number('250') → 250 → truthy → 250
```

Either line works for a number you saved. What never works is adding to or comparing a value that might be text, so when you are not sure what is in the slot, wrap it in `Number()`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Type coercion** | Converting a value from one type to another: e.g. the text `'250'` to the number `250`. |
| **`Number(x)`** | Converts `x` to a JavaScript number. `Number('250')` is `250`, `Number(250)` is `250`, `Number(null)` is `0`. |
| **`||` fallback** | The `||` operator picks the right-hand value when the left is falsy. `value || 0` means "use 0 if value is falsy." |
| **Text comparison** | JS compares two strings character by character: `'9' > '100'` is `true` because `'9'` comes after `'1'`. |
