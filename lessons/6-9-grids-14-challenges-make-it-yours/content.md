## Make it yours

Your brick wall is complete: a grid of 1s and 0s, built with two loops, drawn from the data, and a `hitAt(x, y)` that finds the brick under a pixel. Now change one rule of your own choosing. The editor starts from the finished wall.

**Challenge 1: points by row (easy).**
Make the top rows worth more. In `hitAt`, change `score += 10` so a hit in row `r` scores `(BRICK_ROWS - r) * 10`: the top row is worth 50 and the bottom row 10.

**Challenge 2: two-hit bricks (medium).**
Some bricks take two hits. Let a cell hold 2 as well as 1 and 0: build row 0 with 2s, make a hit lower the cell by 1 instead of setting it to 0, draw a 2 in `'silver'`, and change the places that test `=== 1` to `> 0` so a brick that is still 1 still counts.

**Challenge 3: a wall from text (hard).**
Write the wall as rows of text in `SHAPE`: `#` is a brick, `2` a two-hit brick, `.` a gap. Make `makeBricks()` read it with `SHAPE[r][c]` (the same two-index read as a map in 6.9.5), and set `BRICK_ROWS` and `BRICK_COLS` from it.

Whatever you pick, press R afterwards and check the wall comes back whole.
