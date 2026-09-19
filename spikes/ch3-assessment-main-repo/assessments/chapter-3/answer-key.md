# Chapter 3 — Answer Key

Teacher-facing. Outside `lessons/`, so students never see it.

Everything below is built from the four array methods §3.7 actually teaches —
`.map()`, `.slice()`, `.concat()`, spread — plus loops and `push()` from §3.3.
§3.7.6 names `.filter()` and `.reduce()` as things students will meet elsewhere
but that the book does not teach, so neither assessment requires them.

---

## Ch 3 Group PA — Snack Shack: reference solution

```js
function makeItem(name, price, qty) {
  return { name: name, price: price, qty: qty };
}

function totalValue(list) {
  let total = 0;
  for (const item of list) {
    total = total + item.price * item.qty;
  }
  return total;
}

function lowStock(list, threshold) {
  const short = [];
  for (const item of list) {
    if (item.qty < threshold) {
      short.push(item);
    }
  }
  return short;
}

const receiptLines = (list) => {
  return list.map((item) => item.name + ' x' + item.qty);
};

function sellItem(list, name, count) {
  for (const item of list) {
    if (item.name === name) {
      item.qty = Math.max(0, item.qty - count);
    }
  }
  return list;
}

function saveInventory(list) {
  localStorage.setItem('snack-shack', JSON.stringify(list));
}

function loadInventory() {
  const text = localStorage.getItem('snack-shack');
  if (text === null) {
    return SEED.map(copyItem);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    return SEED.map(copyItem);
  }
}
```

A counted `for (let i = 0; i < list.length; i++)` loop is equally correct
everywhere `for...of` appears above; §3.3.5 teaches both.

`copyItem` is provided in the starter file, so students may call it. Writing
`{ ...item }` inline instead is fine.

### Expected values

With the seed data:

| Call | Result |
|---|---|
| `totalValue(SEED)` | **109.00** — Popcorn 42, Pretzel 12, Soda 45, Nachos 10 |
| `lowStock(SEED, 5)` | Pretzel (3) and Nachos (2) |
| `receiptLines(SEED)` | `["Popcorn x12", "Pretzel x3", "Soda x20", "Nachos x2"]` |

### Things you will actually see

- **`makeItem` with no `return`.** They build the object and never hand it back.
  Self-check 1 fails. This is the §3.2 lesson landing.
- **`totalValue` with `.reduce()`.** Gets the right number. §3.7.6 named the
  method, so this is not cheating — but it skips the accumulator the chapter
  teaches. Behavior points yes, technique points no; `code2` is your flag.
- **The accumulator declared inside the loop.** `let total = 0` on the wrong
  line resets every pass and returns only the last item's value. Ask them to say
  the loop aloud.
- **`lowStock` with `.filter()`.** Same story as `.reduce()` above — `code3` goes
  red. Behavior points, not technique points.
- **`lowStock` returning `list` itself** after an `if` that filtered nothing.
  Self-check 3 checks `out !== sample`, so this fails.
- **`receiptLines` with a loop and `push()`.** Correct output, but `map()` is the
  one method §3.7 does teach and this is where it belongs. `code4` goes red.
- **`receiptLines` with a capital X or a missing space.** `"Popcorn X12"` or
  `"Popcorn x 12"` fails on an exact string compare. Worth partial credit — the
  shape is right, the spec was not read.
- **`sellItem` making a copy.** Wrong *here*, on purpose: the task wants the side
  effect, so the caller's array must change. A student who copies fails the
  self-check because nothing they did was visible outside the function. This is
  the deliberate mirror of `addScore` on the test, where copying *is* required —
  the pair exists to show that copy-or-mutate is a decision, not a habit.
- **`sellItem` with `qty - count` and no floor.** Goes negative; self-check 5
  catches it on the second call.
- **`loadInventory` with no null check.** A key that was never saved reads as
  `null`, and `JSON.parse(null)` quietly returns `null` rather than throwing, so
  the fallback never runs. Self-check 6 catches it. This is the §3.8.5 point.
- **`loadInventory` with no `try...catch`.** Works until the stored text is
  unreadable, then throws and takes the page with it. Self-check 7 catches it
  separately from 6, so you can see which half they missed. §3.8.4.
- **`loadInventory` returning the raw string.** Forgetting `JSON.parse` returns
  text; `Array.isArray` fails.
- **Returning `SEED` itself** rather than a copy when nothing is saved. Later
  sells then mutate the seed. Self-check still passes — mention it at the demo,
  it is the §3.6 idea showing up unprompted.

---

## Ch 3 Test — Gradebook: reference solution

```js
function average(scores) {
  if (scores.length === 0) {
    return 0;
  }
  let total = 0;
  for (const n of scores) {
    total = total + n;
  }
  return total / scores.length;
}

function highest(scores) {
  return Math.max(...scores);
}

function passing(students, cutoff) {
  const made = [];
  for (const student of students) {
    if (average(student.scores) >= cutoff) {
      made.push(student);
    }
  }
  return made;
}

function addScore(student, score) {
  return { ...student, scores: [...student.scores, score] };
}
```

`passing` calling `average` is composition (§3.2.6) and is the intended shape.

### Expected values

| Call | Result |
|---|---|
| averages | Ana 86.3, Ben 61.7, Cruz 97.7, Dee 71.7 |
| class average | **79.3** |
| `passing(ROSTER, 70)` | Ana, Cruz, Dee |
| `highest` per student | Ana 92, Ben 70, Cruz 100, Dee 75 |

Ben is the interesting one: his best score is exactly 70 but his average is
61.7, so he does **not** pass. A student whose `passing` compares the wrong
number will usually include him.

### Things you will actually see

- **`average([])` divides by zero** and returns `NaN` because the guard is
  missing. Self-check 1 fails on the second half only — partial credit.
- **The guard written as `if (scores.length === 0) { }` with the return outside.**
  §3.2.4 is exactly this: `return` ends the function, and putting it in the wrong
  place means the guard does nothing.
- **`highest` with `Math.max(scores)`.** Returns `NaN`. §3.7.4 shows this exact
  failure — the book's own example is `Math.max([3, 9, 4])`. If they saw the NaN
  and did not know why, that is the section to point at.
- **`highest` with a loop.** Correct answer, misses §3.7.4. `t5` goes red:
  behavior points, not technique points.
- **`passing` comparing `student.scores >= cutoff`** instead of the average.
  Compares an array to a number, which coerces and mostly fails.
- **`passing` returning `students` itself.** Self-check 3 checks
  `out !== sample`, so this fails even when the roster happens to be all passing.
- **`addScore` doing `student.scores.push(score); return student;`** The headline
  error. It mutates the caller's object, so `updated !== s` is false and the
  original grows. Fails self-check 4 and `t6`. Tie the feedback straight to Q2.
- **Shallow copy only:** `{ ...student }` followed by `copy.scores.push(score)`,
  or `{ ...student, scores: student.scores }`. The *object* is new, the *array*
  is shared, so pushing changes both. This is the sharper version of the same
  misconception and the one worth the most written feedback — it is the §3.6 Key
  Term "shallow copy" landing in real code. Self-check 4 checks
  `updated.scores !== s.scores` precisely to catch it.

---

## Written section

**Q1 (§3.2) — parameter vs argument.**
A parameter is the placeholder name in the function definition; an argument is
the actual value supplied at the call. In `average(scores)`, `scores` is the
parameter; in `average(student.scores)`, `student.scores` is the argument. Full
credit needs both the distinction *and* a pointer at their own code.

**Q2 (§3.6) — does the caller's array change, and what about reassigning?**
Yes, it changes. The parameter holds a copy of the *reference*, not a copy of
the array, so both names point at the same array and a change inside is visible
outside. Accept any clear phrasing of "they are the same array."

The second half is the discriminator. **Reassigning** the parameter — pointing it
at a brand new array — affects only that one name inside the function; the
caller sees nothing. That is §3.6.2, "Changing vs. Reassigning," and it is why
"JavaScript passes by value" and "the caller's array changed" are both true at
once. Full credit needs both halves. Award 6–8 for a correct first half with a
vague or missing second. Do not accept "because arrays are global."

**Q3 (§3.2) — no return statement, and printing vs returning.**
The function hands back `undefined`. Doing math with it yields `NaN`; reading a
property off it throws a TypeError.

The `console.log` half is §3.2.5, "Printing Is Not Returning." Printing sends
text to the screen for a human to read and leaves the function's value as
`undefined`, so nothing downstream can use it — you cannot store it, pass it on,
or build with it. A function that prints has produced no value; a function that
returns has. Full credit needs that distinction, not just "log shows it."

**Q4 (§3.7) — non-mutating vs mutating, and why copying is easier to trust.**
`.slice()` is **non-mutating**: it returns a new array and leaves the original
alone. `.push()` is **mutating**: it changes the array it is called on. Both
terms are in the §3.7 Key Terms, and using them correctly is most of the mark.

For the second half, accept any clear version of: a function that returns
something new cannot surprise code that was not expecting a change, so you can
read the call and know the inputs survived it. A mutating call means anyone
holding that array now has different data without asking — the §3.6 "side
effect" idea. Students often reach for their own `addScore` here, which is the
best possible answer; give full credit and say so.
