## Sprite property tour: pos, rotation, layer

Read before `2.1.4 Worked Example — Minimum Sprite Program`. About 5 minutes.

By the end of this reading you should be able to answer:

- How do you read a sprite's current x position?
- What unit does `rotation` use — degrees or radians?
- When two sprites overlap, which property decides which one appears on top?

Once you have a sprite stored in a variable, you can read or change its properties at any time using dot notation (`player.someProperty`).

**What you'll learn from it:**

- `player.pos.x` and `player.pos.y` hold the sprite's current centre position; you can read or overwrite them.
- `player.rotation` is the tilt in degrees (clockwise). `0` is upright; `90` points the top edge to the right.
- `player.layer` controls draw order. A sprite with a higher layer number appears in front of sprites with lower numbers.
- `player.color` (already familiar from 2.1.3b) is also a property — included here as a recap row.

**Try it:**

```js live
let player;
let box;

function setup() {
  new Canvas(360, 280);

  player = new Sprite(120, 140, 80, 80);
  player.color = 'deepskyblue';
  player.rotation = 30;     // tilt 30 degrees clockwise
  player.layer = 2;         // draw in front of box

  box = new Sprite(150, 160, 80, 80);
  box.color = 'tomato';
  box.layer = 1;            // draw behind player
}

function draw() {
  background('#222');
}
```

**What you'll see:** a tilted blue square overlapping a red square, with the blue one on top because its `layer` is higher.

**Try this:** swap the two `layer` values (`player.layer = 1`, `box.layer = 2`) and run again — the red square jumps in front. Then add `player.pos.x = 80;` at the bottom of `setup()` to reposition the blue sprite before the sketch starts.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Property** | A named value attached to an object, accessed with dot notation (`player.color`). |
| **`pos`** | An object holding the sprite's current centre. Read or set via `player.pos.x` / `player.pos.y`. |
| **`rotation`** | Clockwise tilt in degrees. `0` = upright; `90` = top edge points right. |
| **`layer`** | Draw-order index. Higher value = drawn in front of lower-value sprites. |

*"One more sprite property exists — `vel` — but it deserves its own reading. You'll meet it in 2.1.7a."*
