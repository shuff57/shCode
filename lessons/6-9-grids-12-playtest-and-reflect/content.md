## Playtest and reflect

A playtest is playing your own work on purpose, to find out what it does, not to win. Programmers do it after every build: the labs checked that the code has the right shape, and only playing it shows whether it behaves the way you meant.

**How to play on purpose.** Play your finished Coin Maze from 6.14.8 (Lab: The next level) to the end at least once, and clear your brick wall from 6.14.11 (Lab: A wall of bricks) to "Cleared!" once. Then try to break each one. In the maze, stand on the green goal before you have every coin and see what happens, then press R in the middle of level 2. In the wall, click above the wall, click below it, click a gap that is already empty, and click the same brick twice. Watch for anything that looks odd: a level that loads with the old walls still there, a player that starts in the wrong place, a brick that vanishes when you click next to it, a count that does not match what you see.

**Then think backwards.** When something looks odd, ask which part of your code could cause it: the map, `findStart`, `loadLevel`, the click-to-cell conversion, the bounds check. Naming the part is the first step of fixing it, even when you are not sure.

**Then choose one change.** Think of one rule or number you would change, such as a fourth level, coins worth more in the last level, a taller wall or a different brick size, and what it would do to the game.

Write your response in the box below. Short sentences or a numbered list both work. Aim to cover:

1. How many times you played, and how it went.
2. One thing that surprised you or did not work as you expected.
3. Which part of your code you think that comes from.
4. One rule or number you would change, and what it would do.

---

## Rubric

| # | Criterion |
|---|-----------|
| 1 | Says how many times they played and how it went |
| 2 | Names one thing that surprised or broke |
| 3 | Says which part of the code that touches |
| 4 | Names one rule they would change and what it would do |
