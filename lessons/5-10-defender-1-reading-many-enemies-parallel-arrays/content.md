## Many enemies, kept in parallel arrays

**Read before `5.10.2 Lab: A field of enemies`.** About 8 minutes.

By the end of this reading you should be able to answer:

- Which three arrays hold one enemy, and what ties them together?
- What has to happen to all three arrays when an enemy arrives, and when it leaves?
- Why is the falling speed one number and not a fourth array?

**Built the old way, on purpose.** You already know a class would hold this better (5.7.15 Reading: Parallel Arrays vs Classes). This module builds it the way you would have before classes, on purpose, so that 5.11 has something real to fix. Keep a tally as you go: every time you type the same kind of line once for each of three arrays, make a mark.

**From one drone to many enemies.** Part A had one drone in one variable; a hit sent it back to the top. Now there are many enemies on the screen at once, and each one knows two things a sprite does not: how many more hits it can take (its **hp**) and how many points it is worth when it is shot down (its **worth**). A crimson enemy has 1 hp and is worth 10. An orange one is tough: 3 hp, worth 30.

A sprite already remembers where it is. For the other two facts, this module keeps two more arrays beside the array of sprites:

```js
// Three parallel arrays: index j in all three is the same enemy.
let enemies, enemyHp, enemyWorth;
```

**One enemy arrives.** Here is the function that builds one. Read it line by line:

```js
// Builds one enemy and adds it to all three arrays, so they stay in step.
function spawnEnemy(x, y, hp) {
  const e = new Sprite(x, y, 30, 30);
  e.collider = 'none';
  e.color = hp > 1 ? 'orange' : 'crimson';
  e.text = String(hp);
  enemies.push(e);
  enemyHp.push(hp);
  enemyWorth.push(hp * 10);
}
```

- `collider = 'none'` makes it a pass-through sprite, like the goal in 5.2.17 and the drone in Part A, so shots and enemies never shove each other.
- `hp > 1 ? 'orange' : 'crimson'` is the conditional operator (`test ? this : that`): orange when the enemy has more than 1 hp, crimson when it does not.
- `e.text = String(hp)` writes the hp on the enemy, the same way 5.8.8 put a number on a sprite.
- Then **three pushes**, one per array: the sprite, its hp, and its worth (10 points per hp).

**The index is the only glue.** After three calls, the arrays look like this:

| index j | `enemies[j]` | `enemyHp[j]` | `enemyWorth[j]` |
| --- | --- | --- | --- |
| 0 | a crimson sprite | 1 | 10 |
| 1 | a crimson sprite | 1 | 10 |
| 2 | an orange sprite | 3 | 30 |

Nothing in the code says that `enemies[2]`, `enemyHp[2]` and `enemyWorth[2]` belong together. Only the number 2 does.

**The rule.** Every push and every splice happens to **all three arrays, at the same index**. Arriving is three pushes. Leaving is the sprite deleted from the screen, then index `j` spliced out of all three:

```js
enemies[j].delete();        // off the screen
enemies.splice(j, 1);       // out of all three arrays,
enemyHp.splice(j, 1);       // at the same index
enemyWorth.splice(j, 1);
```

**Falling, by hand.** Enemies fall the way the drone did in Part A (`drone.y += 1.5`): a loop adds to each one's `y` on every frame, inside `if (playing)`. The loop runs backwards, as `moveBullets()` does, because a removal splices (5.4.5). One whose `y` is more than `BASE_Y` has reached the base, which costs the base 1 hp, exactly as the drone did in 5.9.7.

```js
enemies[j].y += fallSpeed;
```

**One number, not a fourth array.** Every enemy falls at the same speed, so `fallSpeed` is one variable, not an array. Only a fact that can be different for each enemy needs an array of its own.

**Why the rule matters.** 5.7.15 showed what one forgotten `splice` does: the arrays fall out of step, and from that index on every enemy reads another enemy's numbers.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **parallel arrays** | several arrays where the same index describes the same thing |
| **in step** | the arrays are the same length and index j means the same enemy in each |
| **hp** | how many more hits an enemy can take |
| **worth** | the points an enemy scores when it is shot down |
