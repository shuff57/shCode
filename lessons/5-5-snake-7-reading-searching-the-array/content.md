## Searching the array

**Read before `5.15.3 Lab: Don't bite yourself`.** About 7 minutes.

By the end of this reading you should be able to answer:

- What does it mean to search an array?
- Why can a function return in the middle of a loop?
- Which two questions in Snake are the same search?

**Two questions, one search.**

1. When the snake takes a step, is the cell it is about to enter already part of the body? If so, it bit itself.
2. When the food is placed, is the random cell free? If it lands on the snake, the food is hidden under it.

Both ask the same thing: *is there a segment on this column and row?*

**Write the search once, as a function.** Go through every segment, and if one sits on that cell, answer yes at once:

```js
function isBody(col, row) {
  for (const s of segments) {
    if (s.col === col && s.row === row) return true;
  }
  return false;
}
```

**`return` leaves early.** The moment a segment matches, `return true` ends the whole function. There is no need to look at the rest of the snake. If the loop finishes without finding a match, the last line answers `false`. That final `return false` sits **outside** the loop; if it were inside, the function would stop after checking only the first segment.

**Use it for both questions.** The bite check is one more condition in the test that already looks at the walls:

```js
if (col < 0 || col >= 20 || row < 0 || row >= 20 || isBody(col, row)) {
  playing = false;
}
```

And the food keeps picking a new random cell for as long as the pick lands on the snake:

```js
let col = floor(random(20));
let row = floor(random(20));
while (isBody(col, row)) {
  col = floor(random(20));
  row = floor(random(20));
}
```

One helper, two jobs. If you had written the loop twice, a later fix would have to be made twice too.

**A small simplification.** The test counts the tail's cell as body even though the tail is about to move away. Real Snake lets you follow your own tail. This version is a little stricter, which only ends a few rounds one step early, and it keeps the search to one simple loop.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **search** | going through an array looking for an item that matches |
| **early return** | `return` inside a loop, ending the function as soon as the answer is known |
| **helper function** | a small function written once and called from several places |
