## Why `getItem('highScore') > 100` can lie

**Read before attempting `2.5.6 Worked Example — Load and Display a High Score`.**

You stored a number — `storeItem('highScore', 250)`. You read it back with `getItem('highScore')` and get `"250"`. That is a string, not a number. This is the single most common save/load bug in student games.

**Try it:** the sketch stores `5`, then shows what happens when you add `1` without coercion vs. with coercion. The first gives `"51"` (string concatenation). The second gives `6` (number addition).

```js live
function setup() {
  new Canvas(400, 200);
  storeItem('n', 5);
}

function draw() {
  background('#222');
  if (frameCount === 1) {
    console.log('without coercion:', getItem('n') + 1);        // "51"
    console.log('with    coercion:', Number(getItem('n')) + 1); // 6
  }
  text('Open the console to see both results.', 10, 20);
}
```

---

## The fix: `Number(getItem(key))`

Wrap every `getItem` call in `Number()` when you stored a number:

```js
let highScore = Number(getItem('highScore')) || 0;
```

`Number("250")` gives you `250` — a real number. Now comparisons and arithmetic work correctly.

---

## The fallback: `|| 0`

On the very first run, `getItem('highScore')` returns `null` because nothing has been saved yet. `Number(null)` is `0`, which is falsy, so `|| 0` kicks in and gives you a safe starting value.

```js
Number(getItem('highScore')) || 0
// first run:   Number(null)  → 0 → falsy → 0
// second run:  Number("250") → 250 → truthy → 250
```

---

## The string comparison trap

Without coercion, string comparisons give wrong results:

```js
getItem('highScore') > 100
// "250" > 100 → false (string "2" < number 100)

getItem('highScore') > getItem('oldScore')
// "9" > "100" → true (character '9' > character '1')
```

Always coerce before comparing:

```js
Number(getItem('highScore')) > 100    // 250 > 100 → true ✓
Number(getItem('highScore')) > Number(getItem('oldScore'))  // 250 > 100 → true ✓
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Type coercion** | Converting a value from one type to another — e.g. string `"250"` to number `250`. |
| **`Number(x)`** | Converts `x` to a JavaScript number. `Number("250")` is `250`, `Number(null)` is `0`. |
| **`||` fallback** | The `||` operator picks the right-hand value when the left is falsy. `value || 0` means "use 0 if value is falsy." |
| **String comparison** | JS compares strings character by character — `"9" > "100"` is `true` because `'9'` comes after `'1'`. |
