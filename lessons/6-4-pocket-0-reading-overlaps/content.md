## Overlaps: a question, not a collision

**Read before `6.4.2 Reading: A pocket you roll over`.** About 8 minutes.

By the end of this reading you should be able to answer:

- What is the difference between `colliding()` and `overlaps()`?
- Why does a sprite with `collider = 'none'` need `overlaps()` instead of `colliding()`?
- Why is `overlaps()` true on many frames, and how do you make something happen once?

`colliding()` and `overlaps()` both ask "are these two sprites touching?", but they ask it of different things. `colliding()` reads the **physics bodies**: it is true while two solid sprites press against each other, and the engine pushes them apart. `overlaps()` does not look at the physics at all. It compares the two sprites' **boxes** and nothing else. It never pushes.

| | `colliding(other)` | `overlaps(other)` |
| --- | --- | --- |
| What it reads | real physics contact (Box2D) | the sprites' boxes |
| Does it push? | yes, the bodies react | no, nothing moves |
| Works on `collider = 'none'`? | no, there is no body | yes |
| Use it for | floors, walls, enemies that block | coins, goals, pockets, bullets that pass through |
| Fires | every frame they touch | every frame they overlap |

A sprite with `collider = 'none'` is a **sensor**. It still draws, but it has no physics body, so nothing collides with it and `colliding()` can never see it. That is what makes it useful: a coin, a goal zone, a pocket or a bullet should not shove the player around. You ask about it with `overlaps()`.

## One overlap is many frames

`overlaps()` is a question about **this frame**. While the player stands on the coin, it answers true on every frame. This is the same level-triggered problem as `colliding()` in 5.4.1, and it has the same fix: remember whether it was already true.

```js
let taken = false;

function draw() {
  if (player.overlaps(coin) && !taken) {
    taken = true;      // this coin is finished; never count it again
    score += 1;
  }
}
```

`taken` stays true, so the coin can only be collected once. If the thing can be triggered again — a button the player steps off and back onto — reset the flag when they are apart, exactly like the `wasTouching` pattern:

```js
let wasTouching = false;

function draw() {
  const touching = player.overlaps(button);
  if (touching && !wasTouching) {
    score += 1;
  }
  wasTouching = touching;
}
```

**Try it:**

```js live
let player, coin, score, taken;

function setup() {
  new Canvas(360, 240);
  player = new Sprite(80, 120, 36, 36);
  player.color = 'deepskyblue';

  coin = new Sprite(250, 120, 24, 24);
  coin.color = 'gold';
  coin.collider = 'none';   // a sensor: draw it, but never push the player

  score = 0;
  taken = false;
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('score ' + score, 12, 24);

  if (kb.pressing('right')) player.x += 3;
  if (kb.pressing('left')) player.x -= 3;

  if (player.overlaps(coin) && !taken) {
    taken = true;
    score += 1;
  }
}
```

**What you'll see:** walk the blue square over the gold coin and the score goes to 1. Stay on it: it does not climb. Now delete `&& !taken` and walk onto the coin again. The score races, because the `if` runs on every frame the boxes overlap — the same bug as the ball resting on the goal in 5.4.1. Put the condition back.

**Try this too:** delete the `coin.collider = 'none';` line so the coin is a solid body, and change the check to `player.colliding(coin)`. The player now shoves the coin around, because `colliding()` is a physics contact. That is correct for a wall and wrong for a pickup.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| `overlaps(other)` | true while the two sprites' boxes intersect; does not push or move anything |
| `colliding(other)` | true while two physics bodies touch; the engine reacts to the contact |
| sensor | a sprite with `collider = 'none'`: it draws but has no body, so it is asked about with `overlaps()` |
| level-triggered | true on every frame the condition holds (`overlaps`, `colliding`, `kb.pressing`) |
| edge-triggered | true only on the frame something starts (a remembered flag, like `taken`) |
