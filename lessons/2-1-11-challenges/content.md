## Challenge 1 — Color-changing sprite (easy)

Make the player sprite change color every time any arrow key is pressed.

**Hints:**
- Use `kb.presses('left')` (not `pressing`) so the color only changes once per key tap, not 60 times per second.
- Pick from an array of colors: `let colors = ['red', 'green', 'blue', 'hotpink'];`
- Keep a counter and do `colors[counter % colors.length]` to cycle.

**Stretch it further:** random color each press — `player.color = colors[Math.floor(Math.random() * colors.length)];`

---

## Challenge 2 — Orbiting companion (medium)

Add a second sprite that moves in a **circle** around the player. It should follow the player wherever the player goes.

**Hints:**
- Use both `sin` and `cos`:
  ```js
  companion.pos.x = player.pos.x + cos(frameCount * 0.05) * 60;
  companion.pos.y = player.pos.y + sin(frameCount * 0.05) * 60;
  ```
- Because `companion.pos.x/y` is set every frame, the companion won't respond to physics — that's fine for this challenge.

**Stretch it further:** two companions orbiting in opposite directions (one uses `+frameCount`, one uses `-frameCount`).

---

## Challenge 3 — Inspect + display (hard)

Open browser DevTools (`F12`) with your sketch running, poke at `player` in the Console tab, then render one of the values you found **on the canvas** using `text()`.

**Hints:**
- In DevTools: try `player.color`, `player.constructor.name`, `Object.keys(player)`. You don't need to understand all of it — you'll learn about classes in Week 12.
- Back in the editor, `text('hello', 10, 20)` draws text at pixel (10, 20). Call `fill(255)` and `textSize(14)` first.
- Render something dynamic: `text(\`x: ${Math.round(player.pos.x)}\`, 10, 20)` updates as the sprite moves.

**Stretch it further:** Two lines of text — one for `player.color`, one for `player.pos`. Use a template string to combine them.

---

## Challenge 4 — On-screen HUD with multiple values (medium)

Display three things at the top of your canvas:
- The current `frameCount`
- The current player `x` and `y` position (rounded to integers)
- The current frame rate (`frameRate()` returns the actual fps)

**Hints:**
- Use `textSize(14); fill(255);` before drawing text.
- `text()` can be called multiple times at different y positions.
- `Math.round(player.pos.x)` keeps the number from jittering.

**Example output:**
```
Frame: 432
Player: (247, 103)
FPS: 60.0
```

---

## Challenge 5 — Trail effect (medium, creative)

Make the player sprite leave a trail behind it as it moves.

**Hints:**
- Easy path: call `background('#222', 20)` instead of `background('#222')` — the second argument is alpha, so older frames fade instead of being overwritten fully.
- Honest path: track the last N positions in an array. Each frame, `trail.push({x: player.pos.x, y: player.pos.y})` then `trail.shift()` once the array is longer than you want.
- To draw the trail, `circle(x, y, 6)` works, and `fill(255, 255, 255, i * 8)` fades older positions.

**Stretch it further:** rainbow trail — vary `fill()` by `i` so each trail-point is a different hue.

---

## Challenge 6 — Very hard, very stretchy — mouse-following

Make a third sprite that always follows the **mouse cursor** — but smoothly, not snappily.

**Hints:**
- `mouse.x` and `mouse.y` give the mouse position each frame.
- For smoothness, use linear interpolation — `lerp(a, b, t)` returns a value `t` of the way from `a` to `b`.
  ```js
  third.pos.x = lerp(third.pos.x, mouse.x, 0.05);
  third.pos.y = lerp(third.pos.y, mouse.y, 0.05);
  ```
- Smaller `t` = laggier follow. Larger `t` = snappier.

This is the same math you'll use in Module 2.4.1 for smooth camera follow.

---

## If you finish all six

- Try pairing up — give your best challenge solution to a classmate to read. Explain what it does.
- Browse `/docs/shplay` beyond the chapters this week. Find one feature that looks interesting. Read about it. Come tell the class next session what you found.
