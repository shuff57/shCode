## Playtest and reflect

A playtest is playing your own work on purpose, to find out what it does, not to win. Programmers do it after every build: the labs checked that the code has the right shape, and only playing it shows whether it behaves the way you meant.

**How to play on purpose.** Play your finished Breakout from 7.14.2 (Lab: Pick a mode) at least twice: once with the mouse (press 1) and once with the arrow keys (press 2). Then try to break it. Catch the ball on the very ends of the paddle and in the middle. Slide the paddle into the ball from the side as it comes down. Let the ball fall out three times. Get the ball behind the wall, between the bricks and the top. Press R at the end and pick the other control. Watch for anything that looks odd: a ball that shivers along the paddle, a brick that breaks before the ball reaches it, a ball that slips through the corner of a brick, a count that does not match what you see.

**Then think backwards.** When something looks odd, ask which part of your code could cause it: `moveBall`, the paddle bounce and its `vy > 0` test, the steering line, `hitAt`, the four edge tests in `hitBricks`, `checkEnd`, `pickMode`. Naming the part is the first step of fixing it, even when you are not sure.

**Then choose one change.** Think of one rule or number you would change, such as a faster ball, a narrower paddle, more lives, bricks that take two hits or a second wall, and what it would do to the game.

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
