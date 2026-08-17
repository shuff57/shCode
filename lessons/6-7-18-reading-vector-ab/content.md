## Direction from A to B

**Read before attempting `6.7.19 Worked Example — Launch a Sprite with applyForce`.**

When you want to push sprite A toward sprite B, you need to know which direction "toward B" is. Two numbers tell you: `dx` and `dy`.

```js
let dx = b.pos.x - a.pos.x;
let dy = b.pos.y - a.pos.y;
```

That's it. `dx` is how far right B is from A. `dy` is how far down B is from A. Together, the pair `(dx, dy)` points from A toward B. If you scale both by the same constant `k` and pass them to `applyForce`, the impulse travels in that direction:

```js
a.applyForce(dx * k, dy * k);
```

This is pure math — no special shplay function needed beyond reading `.pos.x` and `.pos.y`.

**What you'll learn from it:**
- Subtracting A's position from B's position gives the direction vector from A to B.
- `dx` positive means B is to the right; `dx` negative means B is to the left.
- `dy` positive means B is below; `dy` negative means B is above.
- Multiplying `(dx, dy)` by a constant scales the strength without changing the direction.

**Try it:** move the yellow target with the arrow keys. Watch how `dx` and `dy` change in the canvas — they always describe where the target is relative to the blue ball.

```js live
let ball, target;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;

  ball = new Sprite(100, 150, 30);
  ball.color = '#bd93f9';
  ball.collider = 'static';

  target = new Sprite(300, 150, 30);
  target.color = '#f1fa8c';
  target.collider = 'static';
}

function draw() {
  background('#282a36');

  if (kb.pressing('up'))    target.pos.y -= 2;
  if (kb.pressing('down'))  target.pos.y += 2;
  if (kb.pressing('left'))  target.pos.x -= 2;
  if (kb.pressing('right')) target.pos.x += 2;

  let dx = target.pos.x - ball.pos.x;
  let dy = target.pos.y - ball.pos.y;

  fill('#f8f8f2');
  textSize(16);
  text('dx: ' + round(dx), 10, 30);
  text('dy: ' + round(dy), 10, 55);
  text('(arrow keys move the yellow target)', 10, 280);
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Vector** | A pair of numbers `(dx, dy)` that encodes both a direction and a distance. |
| **`dx`** | `b.pos.x - a.pos.x` — how far right B is from A (negative means left). |
| **`dy`** | `b.pos.y - a.pos.y` — how far down B is from A (negative means up). |
| **Force direction** | Pass `(dx * k, dy * k)` to `applyForce` to push A toward B with strength proportional to `k`. |
