## Finished in one place

**Read before `7.6.4 Lab: Enemy takes over`.** About 10 minutes.

By the end of this example you should be able to answer:

- Why does nothing get spliced inside the loops any more?
- What are the two places a finished object has to leave, and in which order?
- What goes wrong if one of the two is missing, or they are swapped?

**The rule.** In Part B an enemy could leave in two places, the landing and the kill, and each place deleted the sprite and spliced the arrays on the spot. With classes the game follows a different rule, **finished in one place**:

1. **Inside the frame, objects only change their own state.** A hit calls `takeHit`, a landing calls `land`. Nothing is deleted and nothing is spliced inside a loop. A finished enemy is simply one whose `isAlive()` now answers `false`.
2. **Once, at the end of the frame, the scene clears each list in two places, in this order.** First the screen: every finished one has its sprite removed. Then the list: `filter` keeps only the alive ones.

These are the same two places Flappy's pipes left from, the screen and the array, now written once instead of in every loop. It also means nothing can remove the same enemy twice: a finished enemy is removed on the one frame it is filtered out, and the next frame it is not in the list to be found again.

The enemy below is the shape you will finish in the lab: `takeHit` and `isAlive` from 7.3.8 and 7.3.9, a `land()` that uses the enemy up, and a `remove()` that deletes its sprite. Two numbers are on screen. `allSprites` is moSHion's own list of every sprite that exists, so `allSprites.length` counts what is really on the canvas.

```js live
// Finished in one place: the enemy changes its own state; the scene removes
// finished enemies from the screen and the list, in that order, once a frame.
class Enemy {
  constructor(x, y, hp) {
    this.hp = hp;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.collider = 'none';
    this.sprite.color = hp > 1 ? 'orange' : 'crimson';
    this.sprite.text = String(hp);
  }

  move() {
    this.sprite.y += 1;
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
    this.sprite.text = String(this.hp);
  }

  isAlive() {
    return this.hp > 0;
  }

  land() {
    this.hp = 0;
  }

  remove() {
    this.sprite.delete();
  }
}

let enemies;

function setup() {
  new Canvas(400, 300);
  enemies = [];
}

function draw() {
  background('#111');

  if (frameCount % 40 === 0) enemies.push(new Enemy(random(30, 370), -20, floor(random(1, 4))));
  if (kb.presses('space') && enemies.length > 0) enemies[0].takeHit(1);

  for (const e of enemies) {
    e.move();
    if (e.isAlive() && e.sprite.y > 280) e.land();
  }

  // The two places: first the screen, then the list.
  for (const e of enemies) {
    if (!e.isAlive()) e.remove();
  }
  enemies = enemies.filter((e) => e.isAlive());
}

function drawTop() {
  fill('white');
  textSize(16);
  text('in the list: ' + enemies.length, 12, 24);
  text('sprites on screen: ' + allSprites.length, 12, 46);
  text('Space hits the oldest enemy', 12, 290);
}
```

**What you'll see:** enemies with 1, 2 or 3 hp drift down. Space knocks 1 off the oldest one, and its number counts down; at 0 it vanishes. One that reaches the bottom vanishes too. The two numbers at the top always agree, because every finished enemy leaves the screen and the list on the same frame.

**Try this:**

1. Delete the three lines of the `remove()` loop and run it. "Sprites on screen" climbs past "in the list": finished enemies are gone from the list but still on screen, frozen ghosts that nothing moves any more, as the dead enemies stayed on screen in 7.3.13 (Lab: Reap the dead with filter).
2. Put the loop back, then swap the two parts so the `filter` line runs first. The same ghosts appear: the finished enemies are dropped from the list before the loop that would remove their sprites can find them. Screen first, then the list.
3. Put it back the right way round and press Space again and again. Nothing is spliced anywhere, yet the list never holds a finished enemy for more than one frame.
