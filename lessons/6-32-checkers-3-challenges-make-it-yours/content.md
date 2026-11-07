## Make it yours

Your checkers is complete: a board made from a grid of letters, pieces that step, jump and jump
again, kings that move both ways, a winner when a player has no move, and a game that plays a
classmate on another computer. Now change one rule of your own choosing. The editor starts from
your finished game.

**Challenge 1: show the legal squares (easy).**
When a piece is picked up, put a dot on every square it may move to. Two loops visit every
square, and `isLegal(picked.r, picked.c, r, c)` (6.28.1) says which ones get a dot. Nothing about
the rules changes: the dots ask the same function the click asks.

**Challenge 2: a draw after 40 quiet moves (medium).**
Count the moves since the last jump: `let quiet = 0;`, set back to 0 in `newGame()` and after a
jump, and add 1 after a step. At 40, the game is a draw. Use a winner value that is neither
colour, so the clicks stop and R still works.

**Challenge 3: jumps you must take (hard).**
In real checkers, a player who can jump must jump. Write `anyJump()`, which loops over the board
and asks `canJumpFrom` (6.29.1) about every piece of the player whose turn it is. Then, in
`isLegal`, refuse a step whenever `anyJump()` is true.

Whatever you pick, play a whole game afterwards and check that R starts it again cleanly.
