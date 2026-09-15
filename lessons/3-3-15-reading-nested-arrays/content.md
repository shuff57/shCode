## Lists Inside Lists

**What you'll learn:**
- That an element of an array can itself be an array
- How to read `grid[2][0]` left to right
- Why `grid.length` counts rows, not total values
- How a nested `for...of` loop visits every cell

An array can hold other arrays. Read `grid[2][0]` **left to right**: the outer index `[2]` picks the row, the inner index `[0]` picks the cell within that row.

```js
let grid = [[1, 2], [3, 4], [5, 6]];
//           row0   row1   row2
```

`grid[2][0]` is the first cell of row `2` — the value `5`.

**Try it:** Run the block and check each read.

```js live plain
let grid = [[1, 2], [3, 4], [5, 6]];

console.log(grid[1]);     // [3, 4]  -- the whole row
console.log(grid[1][0]);  // 3       -- first cell of row 1
console.log(grid[2][1]);  // 6       -- second cell of row 2
```

`grid.length` counts **rows**, not total values. Here `grid.length` is `3` — three rows — even though there are six numbers. The outer array does not know how long its rows are; you have to ask a row itself (`grid[0].length`) for that.

**Try it:**

```js live plain
let grid = [[1, 2], [3, 4], [5, 6]];

console.log(grid.length);    // 3 rows
console.log(grid[0].length); // 2 cells in row 0
```

To visit every cell, nest two `for...of` loops — the outer walks rows, the inner walks the cells of each row. This is the nested-loop idea from Module 2.4, now running over arrays.

**Try it:**

```js live plain
let grid = [[1, 2], [3, 4], [5, 6]];

for (let row of grid) {
  for (let cell of row) {
    console.log(cell);   // 1 2 3 4 5 6
  }
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **nested array** | An array whose elements are themselves arrays |
| **2D array** | A nested array read as rows and cells; a way to store a grid or table |
| **`grid[r][c]`** | Row `r`, then cell `c` within that row — read left to right |
| **`grid.length`** | Counts rows, not total values; the outer array does not know row lengths |
