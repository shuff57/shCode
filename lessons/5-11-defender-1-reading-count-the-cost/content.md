## Count the cost

**Read before `5.11.2 Plan: Draw the classes first`.** About 10 minutes.

By the end of this reading you should be able to answer:

- What did keeping one enemy in three arrays cost in Part B, counted in your own code?
- Which of bullet, enemy and spawner pass the three-question checklist, and why is the spawner a class anyway?
- After the rebuild, where does each fact about the game live?

**This module is a refactor.** To *refactor* is to change how code is organised without changing what it does. Part C rebuilds the Part B game with three classes, `Bullet`, `Enemy` and `Spawner`. Every lab in this module keeps the game playing exactly as before: same waves, same speeds, same score. If your game plays differently after a lab, something went wrong, and that is the test.

## Three numbers from Part B

Open your finished Part B game, the one from 5.10.7 (Lab: Waves), and count. In the reference version:

| What | How many | Where |
| --- | --- | --- |
| `splice` calls | **8** | two in `moveBullets()` and `hitEnemies()` for shots, six for enemies |
| lines that name `enemyHp` or `enemyWorth` | **13** | the `let` line, `spawnEnemy()`, both removals, the hit, `startRound()` |
| copies of "remove one enemy" | **2** | the landing in `moveEnemies()` and the kill in `hitEnemies()` |

Each copy of the removal is the same four lines: `delete()` the sprite, then splice `enemies`, `enemyHp` and `enemyWorth` at the same index. In 5.10.8 (Debugging: The enemy that would not die) one of those copies was missing a single `enemyHp.splice`, and from then on every later enemy read somebody else's hp: a crimson "1" took three shots. Nothing in the code said the three arrays belonged together except an agreement that every line had to keep.

## The checklist, honestly

5.7.18 (Reading: When to reach for OOP (3-question checklist)) asks three questions. Here they are for the three things this module turns into classes:

| Thing | More than one? | Its own state? | Its own behaviour tied to that state? | Verdict |
| --- | --- | --- | --- | --- |
| a shot | yes, several in the air | yes: where it is, whether it is used up | yes: it climbs, it answers whether it hit an enemy | `Bullet` is a class |
| an enemy | yes, a whole wave | yes: hp, worth, speed | yes: it falls, it takes a hit, it answers whether it is still alive | `Enemy` is a class |
| the spawner | **no, there is only one** | yes: which wave it is, the pause | yes: it counts the pause down, it builds the next wave | fails question 1 |

`Spawner` answers **no** to the first question, and the checklist would call that a reason not to write a class. It is a class anyway, for one reason you have already met. Its facts change together: the wave number, the pause before the next wave, and the speed that follows from the wave. In Part B a restart had to set back `wave`, `wavePause` and `fallSpeed` on three separate lines, and a forgotten line is exactly the kind of bug 5.10.8 was. With a class, a restart is one line that cannot forget a piece:

```js
spawner = new Spawner();   // a fresh wave 0 and a fresh pause, together
Enemy.spawned = 0;
```

The second line is there because of something 5.8.14 (Reading: One value shared by every instance) showed: a `static` value such as `Enemy.spawned` belongs to the class itself, not to any one enemy and not to a round. Making new enemies never resets it. If each round should count from zero, the restart has to say so.

## Where each fact will live

The same "where it lives" table as 5.8.17 (Worked Example: The wave spawner), for the whole game:

| Job | Owner |
| --- | --- |
| a shot's position and whether it is used up | `Bullet` (`sprite`, `spent`) |
| an enemy's hp, worth, speed, and what a hit does | `Enemy` (`hp`, `worth`, `speed`, `takeHit`) |
| how many enemies this round has built | `Enemy.spawned` (static), set back to 0 by `startRound()` |
| which wave it is and how long until the next | `Spawner` (`wave`, `pause`) |
| which shots and enemies are alive | the scene: `bullets`, `enemies` |
| score, base hp, cooldown, playing | the scene |

Read the second row against the three numbers above. Once an enemy keeps its own `hp` and `worth`, there is nothing to keep in step: `enemyHp` and `enemyWorth` disappear, and with them every `splice` that existed only to keep them in line.

## Longer, and that is fine

The class version is not shorter. The reference Part C has about 177 lines of code against Part B's 138, because each class spells out its constructor and its small methods. What it has instead is **one place for each rule**: one place that says what a hit does, one place that says when an enemy is finished, one place that removes finished things. Part B's 8 splices, 13 parallel-array lines and two removal copies all go to 0.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **refactor** | change how code is organised without changing what it does |
| **parallel arrays** | several arrays where index j in each describes the same thing |
| **static** | a value that belongs to the class itself, read as `Enemy.spawned` |
