**Goal:** Model a tic-tac-toe board as a nested array, read one cell, then print the whole board row by row.

## Step 1: Build the board

A 3x3 board is a nested array of rows. Each row holds three cells, each `"X"`, `"O"`, or `""` (an empty cell). Read left to right: `board[1][2]` is row 1, cell 2.

```js live plain
let board = [
  ["X", "O", "X"],
  ["O", "", "X"],
  ["", "O", ""]
];

console.log(board[1][2]);   // "X" -- row 1, cell 2
console.log(board[2][0]);   // ""  -- bottom-left, empty
```

## Step 2: Print the whole board

A nested loop visits every row, then every cell inside it. Joining each row's cells with a space keeps each row on its own line, which is how the board reads visually.

```js live plain
let board = [
  ["X", "O", "X"],
  ["O", "", "X"],
  ["", "O", ""]
];

for (let row of board) {
  console.log(row.join(" "));
}
```

Run it and you see the board drawn top to bottom:

```
X O X
O  X
 O
```

The inner `for...of` could visit each cell too, but `row.join(" ")` does that work for us here — it reads all three cells of a row, spaces them, and hands back one string to print.

## Step 3: Update a cell by index

Because the board is a nested array, you can change a cell the way you change any array slot — pick the row, then the cell:

```js live plain
let board = [
  ["X", "O", "X"],
  ["O", "", "X"],
  ["", "O", ""]
];

board[1][1] = "O";   // O plays the center cell

for (let row of board) {
  console.log(row.join(" "));
}
```

## Key takeaways

- A grid is a nested array: `board[row][cell]`.
- `board.length` is the number of rows; each row has its own length.
- Nested loops (or `join`) let you visit or print every cell.
- You can write to a single cell with double-index assignment.
