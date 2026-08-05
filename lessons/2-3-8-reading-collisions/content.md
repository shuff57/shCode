# Collisions + Overlaps

Read this before `2.3.10 Worked Example — Safe Despawn`. About 6 minutes.

By the end of this reading you should be able to answer:

- What's the difference between `sprite.overlaps(other)` (boolean) and `sprite.overlaps(other, callback)` (callback)?
- When should you reach for the callback form?
- What do the callback's two arguments mean — `(self, other) => { ... }`?

shplay's overlap detection has two faces. They share a name (`overlaps`) but solve different problems.

---

## Boolean form — "is anything overlapping right now?"

`sprite.overlaps(other)` returns a boolean. It's `true` for the frames the bounding boxes intersect, `false` otherwise.

When `other` is a Group, the answer is "true if **any** member is currently overlapping":

```js
if (player.overlaps(enemies)) {
  // ANY enemy is currently overlapping the player
}
```

This is the right tool when you only need a yes/no signal — "did the player touch a hazard?", "is the cursor over a button?", "did anything enter this trigger zone?". It does **not** tell you *which* sprite was hit.

```js live
let player, enemies;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 30, 30, 'kinematic');
  player.color = 'deepskyblue';

  enemies = new Group();
  enemies.color = 'red';
  for (let i = 0; i < 3; i++) {
    new enemies.Sprite(80 + i * 100, 280, 30, 30);
  }
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else                       player.vel.x = 0;

  if (kb.pressing('w'))      player.vel.y = -3;
  else if (kb.pressing('s')) player.vel.y = 3;
  else                       player.vel.y = 0;

  fill('white');
  textSize(16);
  text('overlaps(enemies): ' + player.overlaps(enemies), 12, 24);
}
```

**What you'll see:** a blue player sprite, three red enemies in a row, and a live overlay reading `overlaps(enemies): false`. Click the canvas to focus, then move the player into an enemy with WASD — the overlay flips to `true`.

**Try this:** change the line to `text('overlaps(enemies[0]): ' + player.overlaps(enemies[0]), 12, 24);`. The overlay only goes `true` when you touch the *first* red sprite — same method, different argument.

---

## Callback form — "do something for each overlapping pair"

`sprite.overlaps(group, (self, other) => { ... })` calls your function **once per overlapping pair this frame**:

- `self` — always the sprite the method was called on (`player` in the example below).
- `other` — the group member that's currently overlapping.

```js
basket.overlaps(apples, (b, apple) => {
  score++;
  apple.delete();
});
```

The callback fires *during* `overlaps`, after shplay has finished its internal iteration. That makes it the safe place to call `apple.delete()` — you can't trip the iterate-then-delete bug because shplay isn't iterating anymore. (`sprite.delete()` destroys the sprite; `group.remove(sprite)` only unparents it. For cleanup, you almost always want `delete()`.)

```js live
let basket, apples, score = 0;

function setup() {
  new Canvas(360, 360);
  basket = new Sprite(180, 320, 60, 14, 'kinematic');
  basket.color = 'saddlebrown';

  apples = new Group();
  apples.color = 'red';
  apples.diameter = 20;
  apples.collider = 'none';
}

function draw() {
  background('#113311');

  if (kb.pressing('a'))      basket.vel.x = -4;
  else if (kb.pressing('d')) basket.vel.x = 4;
  else                       basket.vel.x = 0;

  if (frameCount % 30 === 0) {
    let a = new apples.Sprite(20 + Math.random() * 320, -20);
    a.vel.y = 3;
  }

  basket.overlaps(apples, (b, apple) => {
    score++;
    apple.delete();
  });

  for (let a of [...apples]) {
    if (a.y > 380) a.delete();
  }

  fill('white');
  textSize(20);
  text('Score: ' + score, 12, 28);
}
```

**What you'll see:** a brown basket at the bottom and red apples falling. Move the basket with A/D — every apple it touches deletes itself and the score goes up.

**Try this:** change `frameCount % 30` to `frameCount % 10` for a faster rain. Then change `score++` to `score += 5` — each catch is now worth more. Notice you never had to touch the callback's removal logic.

---

## Picking which form to use

| You need | Use |
|----------|-----|
| A yes/no answer (game-over flag, hit indicator) | `sprite.overlaps(other)` — boolean |
| To do something *per* hit (despawn, score, particle, sound) | `sprite.overlaps(other, callback)` — callback |
| To know *which* sprite hit | Callback form — the second argument is the hit sprite |

A common pitfall: writing `if (player.overlaps(enemies)) enemies[0].delete()`. This compiles, but you've thrown away information about *which* enemy was hit, and deleting the wrong one is easy. Use the callback form whenever the work is per-pair.

---

## Quick reference

| Term | Meaning |
|------|---------|
| **Overlap** | When two sprites' bounding boxes intersect this frame. |
| **Boolean form** | `sprite.overlaps(other)` — `true`/`false` per frame. |
| **Callback form** | `sprite.overlaps(group, (self, other) => { ... })` — fires once per overlapping pair. |
| **Iterate-a-copy** | `for (let s of [...group])` — safe pattern when you might delete during the loop. |
| **Callback** | A function passed as an argument to another function. |

---

Once you can explain why the callback form is the safe place to call `delete()`, open `2.3.10 Worked Example — Safe Despawn`.
