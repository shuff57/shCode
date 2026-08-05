# A10.1 — Sprite Playground

| | |
|---|---|
| **Module** | 2.1.1 Hello Sprite and Movement |
| **Week** | 10 |
| **Type** | Lab (in-app shplay editor) |
| **Points** | 15 |
| **Estimated time** | 45 min |
| **SLO** | SLO 3 — design, implement, test |
| **Due** | End of Week 10 |

**Prerequisites:** complete both in-app lessons (`2.1.5 Hello Sprite` + `2.1.9 Make it Move`) before starting this lab.

**Module resources:**
- 📋 [Module overview](2.1.1_overview.md) — recommended learning order
- 📖 [Readings](2.1.1_readings.md) — shplay docs + FCC refs
- 💡 [Worked examples](2.1.1_worked-examples.md) — reference code from class walkthroughs
- ⭐ [Challenges](2.1.1_challenges.md) — stretch problems if you finish early

---

## Overview

Build a "sprite playground" in the shplay in-app editor. You will combine everything from the two in-app lessons this week (`Hello Sprite` + `Make it Move`) and add two new things: a second sprite that moves on its own, and an on-screen text label.

By the end of this lab, you'll have a single running sketch that demonstrates every concept from Module 2.1.1.

---

## Task

Create a new sketch in the in-app editor with the following features.

### Required features

1. **A canvas** between 300×300 and 800×600 pixels.
2. **One controllable sprite** that moves with WASD keys:
   - `W` → up, `S` → down, `A` → left, `D` → right
   - Use `kb.pressing('w')`, etc.
   - Assign `player.vel.x` and `player.vel.y`
   - **Reset velocity to 0 in the else branch** (no drifting!)
3. **One automatic sprite** that moves on its own using `frameCount`. Pick one of these patterns:
   - Oscillate left–right: `sprite.pos.x = 200 + sin(frameCount * 0.05) * 100;`
   - Orbit in a circle: use both `sin` and `cos`
   - Spin: `sprite.rotation = frameCount * 2;`
4. **An on-screen text label at the top of the canvas** displaying a message of your choice. Use `text()` and `textSize()`.
5. **`background(...)` is called at the start of every `draw()`** — otherwise old frames will stack up.
6. Code follows the class style guide (camelCase, 2-space indent, meaningful variable names, comments on non-obvious lines).

### Why WASD and not arrow keys?

Arrow keys also scroll the browser iframe. Your controllable sprite will be fighting the page scroll. WASD is the safe default for shplay labs.

---

## Starter code

Paste this into `script.js` and fill in the TODOs:

```js
// A10.1 — Sprite Playground
// Author: YOUR NAME
// Module 2.1.1

let player;
let mover;

function setup() {
  new Canvas(500, 400);

  // TODO: create the controllable player sprite
  player = new Sprite(100, 200, 40, 40);
  player.color = 'deepskyblue';

  // TODO: create the automatic mover sprite
  mover = new Sprite(400, 200, 30, 30);
  mover.color = 'orange';
}

function draw() {
  background('#222');

  // TODO: WASD input — remember the else-to-zero pattern
  if (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x = 4;
  else player.vel.x = 0;

  // TODO: add vertical movement (w / s)

  // TODO: make the mover move on its own using frameCount
  // Example: mover.pos.x = 400 + sin(frameCount * 0.05) * 80;

  // TODO: add a text label at the top of the canvas
  // Hint: textSize(18); fill(255); text('Your message', 20, 30);
}
```

---

## Rubric (15 pts)

| Criterion | Pts |
|-----------|-----|
| Canvas renders; no errors on Run | 2 |
| Controllable sprite responds correctly to WASD | 4 |
| Automatic sprite moves on its own | 3 |
| Text label appears at top of canvas | 2 |
| `background(...)` called at start of `draw()` | 1 |
| Else-to-zero pattern applied on both axes | 2 |
| Code follows class style guide (camelCase, 2-space indent, comments) | 1 |

---

## How to submit

1. Click Run in the in-app editor; verify everything works for 30 seconds.
2. Take a screenshot of the running canvas with your text label visible.
3. Copy your `script.js` into the assignment submission.
4. Attach the screenshot.

---

## Tips

- **Sprite drift bug:** if your player keeps moving after you release a key, you forgot the `else` branch that sets velocity back to 0.
- **Speed:** `vel.x = 4` is 4 pixels per frame × 60 fps = 240 px/s. Keep velocities between 2 and 8.
- **frameCount trick:** `frameCount` increases by 1 every frame. Multiply by a small number (0.05) before passing to `sin` so the motion is slow enough to see.
- **Text disappears:** if your text flickers or disappears, you probably placed it above `background(...)`. The background call paints over it. Put text AFTER background.

---

## Stretch (optional, not graded)

- Make the text label change color every 60 frames.
- Add a third sprite that follows your cursor: `third.pos.x = mouse.x; third.pos.y = mouse.y;`
- Make the mover leave a trail (draw small circles at its position each frame).
