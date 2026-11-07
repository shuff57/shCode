## Playtest and reflect

A playtest is playing your own work on purpose, to find out what it does, not to win. The labs
checked that your code has the right shape; only playing it shows whether it behaves the way you
meant.

**How to play on purpose.** Play your finished Quest from 7.20.3 (Lab: Duel a classmate) at least
three times. Play the whole run of enemies at least once, and duel once online if you can: with a
classmate, or by yourself with the lesson open in a second browser tab (6.25.1). Then try to break
it. Guard twice in a row. Drink a potion at full hp, and with none left. Win a fight while you are
guarding. Lose on purpose and press R. Online, press a key when it is not your turn, and press R.
Watch for anything that looks odd: a bar wider than its grey box, hp below 0, a guard that lasts
two hits, an enemy that acts twice, two computers whose hp bars do not match.

**How to set up a test fight.** The end of a fight, or the last enemy, is slow to reach by
playing, so set it up. In `newGame()`, on the line BELOW the one that makes the fighters (in the
campaign, below `fighters = [new Fighter('Hero', ...), enemies[0]];`), add one test line:

```js
  fighters[1].hp = 3;    // TEST: the enemy is one hit from losing. Delete when done.
```

`fighters[0].hp = 1;` instead tests losing, and `fighters[0].potions = 0;` tests a hero with no
potions left. To reach the last enemy fast, change each kind's `hp` in `KINDS` to `1` for one Run.
When you are done, delete the test line and put the real numbers back (14, 24 and 36), so the game
starts as it should again.

**Then think backwards.** When something looks odd, ask which part of your code could cause it:
the `Fighter` class's `takeHit`, `attack`, `guard`, `heal`, `levelUp` or `draw`; or `newGame`,
`choose`, `act`, `enemyTurn`, `fightOver`, `goodMove`, `myTurn` or `onMove`. Naming the method or
function is the first step of fixing it, even when you are not sure. A problem with damage leads
back to `takeHit`, because every hit goes through it.

**Then choose one change.** One rule you would change or add, such as a new kind of enemy, a
special move, a shop, a different number somewhere, and what it would do to the game.

Write your response in the box below. Short sentences or a numbered list both work. Aim to cover:

1. How many times you played, and how it went.
2. One thing that surprised you or did not work as you expected.
3. Which method, function or part of your code you think that comes from.
4. One rule you would change or add, and what it would do.

---

## Rubric

| # | Criterion |
|---|-----------|
| 1 | Says how many times they played and how it went |
| 2 | Names one thing that surprised or broke |
| 3 | Says which method, function or part of the code that touches |
| 4 | Names one rule they would change and what it would do |
