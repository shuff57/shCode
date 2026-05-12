## Two players, one keyboard

**Read before attempting `2.7.25 Worked Example — Two Paddles, Two Schemes`.**

A two-player local game means two people share one keyboard. They can't use the same keys — they'd fight each other. The fix is simple: give each player their own set of keys.

A common split:
- **Player 1** — W / A / S / D (left side of keyboard)
- **Player 2** — Arrow keys (right side of keyboard)

The key check is the same `kb.pressing(...)` you already know — just called twice with different keys:

```js
if (kb.pressing('w')) p1.vel.y = -4;
if (kb.pressing('up')) p2.vel.y = -4;
```

**Independent state means independent variables.** Anything that belongs to "this player" needs its own copy — its own sprite, its own score variable, its own position. The two players never share a variable.

**What you'll learn from it:**
- Each player gets their own key set — no sharing.
- Each player gets their own sprite variable (`p1`, `p2`).
- Each player gets their own score variable (`p1Score`, `p2Score`).
- The patterns are identical — you just write them twice with different names.

**Try it:** use W/S to move the purple paddle, arrow keys to move the green paddle. They move independently — one does not affect the other.

```js live
let p1, p2;
let p1Score = 0;
let p2Score = 0;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;

  p1 = new Sprite(60, 150, 20, 80);
  p1.color = '#bd93f9';
  p1.collider = 'static';

  p2 = new Sprite(340, 150, 20, 80);
  p2.color = '#50fa7b';
  p2.collider = 'static';
}

function draw() {
  background('#282a36');

  if (kb.pressing('w')) p1.pos.y -= 3;
  if (kb.pressing('s')) p1.pos.y += 3;

  if (kb.pressing('up'))   p2.pos.y -= 3;
  if (kb.pressing('down')) p2.pos.y += 3;

  fill('#f8f8f2');
  textSize(14);
  text('P1: W / S', 10, 20);
  text('P2: Up / Down', 270, 20);
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Two-player local** | Two players sharing one keyboard, each with their own key set. |
| **Independent state** | Each player has their own variables — sprite, score, position. Nothing is shared between players. |
| **Key scheme** | The specific keys assigned to one player (e.g. WASD for P1, arrows for P2). |
| **`kb.pressing(...)`** | Returns true every frame that key is held. Call it once per player per key. |
