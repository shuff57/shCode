## Every shot against every enemy

**Read before `7.5.5 Lab: Shoot them down`.** About 10 minutes.

By the end of this reading you should be able to answer:

- With 5 shots and 4 enemies alive, how many overlap tests run in one frame?
- Why do both loops run backwards?
- Why does the inner loop `break` straight after a hit?
- What does a kill remove, and where have you typed those lines before?

**A loop inside a loop.** In 2.4.25 the outer loop picked a row and the inner loop went along every column, so every row met every column. The hit check is the same shape. The outer loop picks a shot; the inner loop tries that shot against every enemy:

```js
for (let i = bullets.length - 1; i >= 0; i--) {      // pick a shot
  for (let j = enemies.length - 1; j >= 0; j--) {    // try it on every enemy
    if (bullets[i].overlaps(enemies[j])) {
      // a hit: see below
    }
  }
}
```

With 5 shots and 4 enemies on the screen, that is 5 times 4 = **20 overlap tests** in one frame. `overlaps()` is the same test 7.4.5 used on the drone: do these two boxes touch this frame?

**Both loops run backwards, because both can splice.** A hit splices the shot out of `bullets`, and a kill splices the enemy out of all three enemy arrays. You met the reason in 5.4.5: a splice moves every later item down one place, and counting down means the items still to visit are never moved. Here it is true twice, once for each loop.

**Stop testing a shot that is gone.** When a shot hits, it is deleted and spliced out straight away, so it cannot score again on the next frame (7.4.5). But the inner loop is still running, and its next turn reads `bullets[i]` again. After the splice, `bullets[i]` is a **different shot** that gets tested a second time, or, if that was the only shot, it is `undefined`. So the inner loop must stop at once:

```js
break;   // this shot is gone: stop testing it against the others
```

`break` leaves only the loop it is directly inside (2.4.27). The inner loop over enemies stops; the outer loop carries on with the next shot.

**What a missing `break` looks like.** With one shot alone on the screen, hitting the second enemy in the array, the next turn of the inner loop asks `undefined` for `.overlaps`, and the sketch stops with the red banner:

```
TypeError: Cannot read properties of undefined (reading 'overlaps')
```

With several shots alive it usually does not crash: `bullets[i]` is just another shot, tested twice. That is why this bug hides.

**What a hit does.** The shot leaves the screen and the array, the enemy loses 1 hp, and its label shows the new number:

```js
bullets[i].delete();
bullets.splice(i, 1);
enemyHp[j] -= 1;
enemies[j].text = String(enemyHp[j]);
```

**What a kill does.** If that hit leaves `enemyHp[j]` at 0 or less, the enemy is shot down. It scores its own worth, then leaves the screen and **all three** arrays at index `j`. The score line comes first: once index `j` is spliced, `enemyWorth[j]` belongs to a different enemy.

```js
if (enemyHp[j] <= 0) {
  score += enemyWorth[j];
  enemies[j].delete();
  enemies.splice(j, 1);
  enemyHp.splice(j, 1);
  enemyWorth.splice(j, 1);
}
```

**Keep that in mind.** Look at the last four lines. They are the same four lines as the landing in `moveEnemies()`: the delete and the three splices. The same rule now lives in two places, and both have to stay right.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **nested loop** | a loop inside another loop; the inner one runs all the way through for each turn of the outer one |
| **break** | ends the loop it is directly inside, and only that one |
| **kill** | a hit that leaves an enemy with no hp: it scores and is removed from all three arrays |
