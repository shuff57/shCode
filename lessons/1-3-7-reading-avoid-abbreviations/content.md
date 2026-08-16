## `a`, `b` and `c` say nothing

Avoid abbreviations and short names like `a`, `b`, `c`, `n`, `d`, `p` — **unless you have a very good reason.** A single letter tells the reader nothing at all. It does not even hint at a category: `d` could be a day, a distance, a date, a discount or a divisor.

The cost is not paid when you write it. You know what `d` means right now. It is paid three weeks later, or by whoever opens the file after you.

**The exception, so you can recognise it later.** A loop counter conventionally called `i` is fine, and you will see it in Chapter 2. Its scope is three lines, its meaning is fixed by decades of convention, and everyone reads `i` as "index". That is what "a very good reason" looks like: tiny scope plus universal convention. It is not a licence for `d`.

Half-abbreviations are the sneakier version. `usrNm`, `calcTot`, `btnClk` — these save four keystrokes and cost the reader a translation step every time. Write `userName`, `calculateTotal`, `buttonClicked`. Nobody has ever opened a file and wished the names were shorter.

**What you'll learn from it:**
- Single letters tell the reader nothing — not even what kind of thing it is.
- The cost is paid by the next reader, which is usually you.
- Chopped-up abbreviations (`usrNm`) are no better than single letters.
- The one accepted exception is a loop counter `i` in a tiny scope.

**Try it:**

```js live plain
// What is this program about? Read the names only.
let n = 3;
let d = 2.5;
let p = n * d;
console.log(p);

// Same arithmetic, and now you know
let hoursWorked = 3;
let hourlyRate = 2.5;
let pay = hoursWorked * hourlyRate;
console.log(pay);
```

Notice you could not have guessed the first version. `n * d` could equally be nights times daily-rate, or number times density. The names were not merely unhelpful — they were the *only* place that information lived, and it was thrown away.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **abbreviation** | A shortened name — `usrNm` for `userName`. Saves typing, costs reading |
| **single-letter name** | `a`, `d`, `p` — carries no information about what it holds |
| **scope** | How much of the program can see a variable. Tiny scope forgives short names |
| **loop counter** | The `i` you will meet in §2.2 — the accepted exception |
