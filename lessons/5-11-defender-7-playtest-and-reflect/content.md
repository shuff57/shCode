## Playtest and reflect

A playtest is playing your own game on purpose, to find out what it does, not to win. Programmers do it after every build, and after a refactor most of all: the labs checked that the code has the right shape, and only playing it shows whether the game still behaves the way Part B did.

**How to play on purpose.** Play at least three rounds of your finished Defender from 7.11.2 (Lab: A Spawner for the waves), and lose in three different ways: let a wave through on purpose, get overrun in a late wave, and press R in the middle of a wave. Watch for anything that looks odd: a wave arriving too soon or not at all, an enemy that takes the wrong number of shots, a score or "enemies faced" that does not start again from 0, a sprite left behind on screen.

**Then think backwards.** When something looks odd, ask which class or function could cause it: `Bullet`, `Enemy`, `Spawner`, the hit loop, `clearFinished()` or `startRound()`. Naming the part is the first step of fixing it, even when you are not sure.

**Then compare.** You have now built the same game twice. Think of one change, such as giving every enemy a shield, fixing the 7.8.3 bug, or adding something to the restart, and ask whether it is easier or harder in Part C than it was in Part B.

Write your response in the box below. Short sentences or a numbered list both work. Aim to cover:

1. How many rounds you played and how they went.
2. One thing that surprised you or did not work as you expected.
3. Which class or function you think that comes from.
4. One change that is easier, or harder, in Part C than it was in Part B, and why.

---

## Rubric

| # | Criterion |
|---|-----------|
| 1 | Says how many rounds they played and how it went |
| 2 | Names one thing that surprised or broke |
| 3 | Says which class or function that touches |
| 4 | Compares one change in Part C with Part B |
