## Chapter 3 Individual PA — Part 5 of 5: Write the Steps

**This is the coding part of the test, and you are doing it alone.** One problem, pick
one of three, write the JavaScript. **20 points**, about **12 minutes**. No Run button.
You submit once; the paper locks on submit.

**What you write:** A single JavaScript program that solves the problem you picked. It
must contain:

- At least **two named functions**, each **called** at least once, each **returning** a
  value
- An **array of record objects**, walked with a loop
- A **`map()` call** with an **arrow function** as its callback
- At least one **spread** copy (`{ ...item }` or `[...list]`)
- A **save/load round trip**: `JSON.stringify` into `localStorage`, and `JSON.parse` back
- **Documentation:** header comment (Problem, Partners = N/A, Date), a const for the
  limit, camelCase names throughout, at least one `console.log` reporting the
  result, `typeof` for one value

**Three problems. Pick one.** They are the same difficulty and the same shape. Adjacent
tables should not pick the same one.

---

### 1. Price Check

Your cart is an array of items, each `{ name, price, qty }`. Write `totalCost` (returns
the total over the whole cart), `receiptLine` (takes one item, returns its
`"name xqty"` line), and `mostExpensive` (returns the item with the highest price). Print
the receipt lines, the total, and the most expensive item. Save the cart to localStorage
under a key and load it back.

---

### 2. Reading Log

Your week is an array of days, each `{ day, minutes }`. Write `totalMinutes` (returns the
week's total), `logLine` (takes one day, returns its `"Mon: 30 min"` line), and
`longestDay` (returns the day with the most minutes). Print the log, the total, and the
longest day. Save the week under a key and load it back.

---

### 3. Watering Rota

Your rota is an array of plants, each `{ name, ml, watered }`. Write `totalWater`
(returns the total millilitres), `label` (takes one plant, returns its `"name — ml ml"`
label), and `waterOne` (takes the rota and a name, marks that plant's `watered` as true
on its own copy, and returns the copy without changing the original). Print the labels,
the total, and the watered copy. Save the rota under a key and load it back.

---

### Rules

- **No classes, no `this`.** Plain functions over plain objects and arrays.
- **The array methods you may use are `map`, `slice`, `concat` and spread.** 3.7.19 named
  the others without teaching them; anything outside the four goes past the chapter.
- **Header comment:** Problem, Partners = N/A, Date.
- **Limit** as a `const`.
- At least one `console.log` that reports a result.
- **`typeof`** for one value.
- **No Run button.** One attempt, paper locks on submit.