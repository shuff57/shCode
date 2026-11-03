## Sprite property tour: pos, rotation, layer

Read before `5.1.11 Hello Sprite`. About 5 minutes.

By the end of this reading you should be able to answer:

- How do you read a sprite's current x position?
- What unit does `rotation` use: degrees or radians?
- When two sprites overlap, which property decides which one appears on top?

Once you have a sprite stored in a variable, you can read or change its properties at any time using dot notation (`player.someProperty`).

**What you'll learn from it:**

- `player.pos.x` and `player.pos.y` hold the sprite's current centre position; you can read or overwrite them.
- `player.rotation` is the tilt in degrees (clockwise). `0` is upright; `90` points the top edge to the right.
- `player.layer` controls draw order. A sprite with a higher layer number appears in front of sprites with lower numbers.
- `player.color` (already familiar from 5.1.6) is also a property: included here as a recap row.

**Try it:**

```js live
let player;
let box;

function setup() {
  new Canvas(360, 280);

  player = new Sprite(120, 140, 80, 80);
  player.color = 'deepskyblue';
  player.layer = 2;         // draw in front of box

  box = new Sprite(150, 160, 80, 80);
  box.color = 'tomato';
  box.layer = 1;            // draw behind player
}

function draw() {
  background('#222');
  // Sprites are solid, so the engine pushes these
  // two apart. Putting them back every frame keeps
  // them overlapping.
  player.pos.x = 120;
  player.pos.y = 140;
  player.rotation = 30;     // tilt 30 degrees clockwise
  box.pos.x = 150;
  box.pos.y = 160;
  box.rotation = 0;
}
```

**What you'll see:** a tilted blue square overlapping a red square, with the blue one on top because its `layer` is higher. Sprites are solid, so on their own the engine would push these two apart until they only touched. The lines in `draw()` put them back every frame, so they stay overlapping and you can see which one is on top.

**Try this:** swap the two `layer` values (`player.layer = 1`, `box.layer = 2`) and run again: the red square jumps in front. Then change `player.pos.x = 120;` to `player.pos.x = 80;` and rerun: the blue square moves left, and the two squares overlap less.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Property** | A named value attached to an object, accessed with dot notation (`player.color`). |
| **`pos`** | An object holding the sprite's current centre. Read or set via `player.pos.x` / `player.pos.y`. |
| **`rotation`** | Clockwise tilt in degrees. `0` = upright; `90` = top edge points right. |
| **`layer`** | Draw-order index. Higher value = drawn in front of lower-value sprites. |

*"One more sprite property exists: `vel`, but it deserves its own reading. You'll meet it in 5.1.15."*
