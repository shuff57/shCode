let grid = [[1, 2], [3, 4]];

console.log(grid[1][0]);   // 3

grid[1][0] = 8;

let total = 0;
for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[r].length; c++) {
    total = total + grid[r][c];
  }
}

console.log(total);   // 1 + 2 + 8 + 4 = 15
