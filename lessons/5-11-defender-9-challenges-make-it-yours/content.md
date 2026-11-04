## Make it yours

Your game is complete: a ship, shots on a cooldown, enemies in waves, a base that can fall, a restart, and three classes that each own their rules. Now change one rule of your own choosing.

**Challenge 1 — a best score (easy).**
A restart wipes the score, which is right. Keep a second variable called `best` that `startRound()` never resets. When a round ends (where `playing` becomes `false`), update `best` if the score beat it, and show it in `drawTop()` under the score. Press R: the score goes back to 0, and `best` stays.

**Challenge 2 — a boss wave (medium).**
In `makeWave()`, every fifth wave also gets a boss. `this.wave % 5 === 0` is true on waves 5, 10, 15 and so on, the same `%` as the `frameCount` beat. On those waves, push one more `new Enemy(...)` into the wave before it is returned: 10 hp, half the wave's speed, and `boss.sprite.color = 'purple';` so it stands out. Because the boss is an `Enemy`, everything else already works: its hp shows on it, every shot takes 1, it is worth `10 * 10`, and the reap removes it when it is finished.

**Challenge 3 — a Ship class (hard).**
The ship is the last thing still kept in loose variables. Make `class Ship` with `this.sprite` and `this.cooldown`, and move `moveShip()` into it as `move()` and `fire()` into it as `fire()`. The list of shots belongs to the scene (the table in 7.6.1), so the ship does not push into it; `fire()` *gives back* what it made: a new `Bullet` when Space is held and the cooldown is done, otherwise `null`, the value that means "nothing here". The scene keeps the list:

```js
const shot = ship.fire();
if (shot) bullets.push(shot);
```

`if (shot)` is false for `null` and true for a Bullet, because `null` is one of the falsy values an `if` treats as false. Remember to delete the old `cooldown` from the scene and reset `ship.cooldown` in `startRound()`.

Whatever you pick, the game must still be playable from a fresh start: press R and everything that belongs to a round goes back.
