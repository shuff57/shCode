## Playtest and reflect

A playtest is playing your own work on purpose, to find out what it does, not to win. The labs
checked that your code has the right shape; only playing it shows whether it behaves the way you
meant.

**How to play on purpose.** Play your finished checkers from 6.31.3 (Lab: Checkers online) at
least three times. Play once online if you can: with a classmate, or by yourself with the lesson
open in a second browser tab (6.25.1). Then try to break it. Try a step backward, a step
sideways and a jump over your own piece. Set up a double jump. Get a piece crowned in the middle
of a chain. Play a game until somebody cannot move. Online, click when it is not your turn, and
press R. Watch for anything that looks odd: a piece that will not move when it should, a jump
that does not take the piece, a king that cannot go back, two boards that do not match.

**Then think backwards.** When something looks odd, ask which part of your code could cause it:
`makeBoard`, `clickAt`, `moveKind`, `isLegal`, `doMove`, `canJumpFrom`, `crown`, `hasAnyMove`,
`play` or `onMove`. Naming the function is the first step of fixing it, even when you are not
sure. Most rule problems lead back to `moveKind`, because every rule lives there.

**Then choose one change.** One rule you would change or add, such as jumps you must take, a
draw after a long game, a bigger board, or a piece that moves differently, and what it would do
to the game.

Write your response in the box below. Short sentences or a numbered list both work. Aim to cover:

1. How many times you played, and how it went.
2. One thing that surprised you or did not work as you expected.
3. Which function or part of your code you think that comes from.
4. One rule you would change or add, and what it would do.

---

## Rubric

| # | Criterion |
|---|-----------|
| 1 | Says how many times they played and how it went |
| 2 | Names one thing that surprised or broke |
| 3 | Says which function or part of the code that touches |
| 4 | Names one rule they would change and what it would do |
