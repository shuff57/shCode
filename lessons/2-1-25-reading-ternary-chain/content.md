## Chaining ? for more than two options

**What you'll learn:**
- How to chain several `?` operators to pick from more than two values
- That JavaScript evaluates a chain left to right, same as an else if chain
- Why the chained version and an else if chain produce identical results

A single `?` picks between two values. Chain several together to pick from more:

```javascript
let message = (age < 3) ? 'Hi, baby!' :
  (age < 18) ? 'Hello!' :
  (age < 100) ? 'Greetings!' :
  'What an unusual age!';
```

JavaScript evaluates left to right, exactly like an `else if` chain:
1. Is `age < 3`? If true, the whole expression is `'Hi, baby!'`. Stop.
2. Otherwise, is `age < 18`? If true, use `'Hello!'`. Stop.
3. Otherwise, is `age < 100`? If true, use `'Greetings!'`. Stop.
4. Otherwise, use `'What an unusual age!'`.

The same logic with `if...else`:

```javascript
if (age < 3) {
  message = 'Hi, baby!';
} else if (age < 18) {
  message = 'Hello!';
} else if (age < 100) {
  message = 'Greetings!';
} else {
  message = 'What an unusual age!';
}
```

Both versions do the same thing. The chained `?` is shorter and produces a value in one expression; the `if...else` version reads more clearly at a glance. Put the smallest cutoff first, same rule as an `else if` chain — the first true test wins.

**Try it:** Change `waist` and re-run to see `size` change.

```js live plain
let waist = 34;
let size = (waist < 30) ? "Small" :
  (waist < 36) ? "Medium" :
  (waist < 42) ? "Large" :
  "Extra Large";
console.log(size);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **chained ternary** | Several `?` operators strung together to pick from more than two values |
| **left-to-right evaluation** | JavaScript checks each condition in the chain in order, same as an `else if` chain |
| **smallest cutoff first** | The chain rule: order conditions so the first one that can match, does |
