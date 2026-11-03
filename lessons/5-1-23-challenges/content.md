## Challenges

These are the same challenges as the Steps panel beside the editor. The Steps panel is the one to follow; this page only repeats it.

1. **Create a canvas.** Inside `setup()`, create a canvas of any size.
2. **Create at least one sprite.** In `setup()`, create a sprite and store it in the top-level `player` variable.
3. **Clear the background each frame.** Call `background()` as the first line of `draw()` so old frames don't stack up.
4. **Build one challenge.** Pick one of the challenges below and build it in `draw()`. The check turns green once any one of them is in `draw()` (or in a function of your own that `draw()` calls), so one is enough on its own.

**Challenge 1: color by key (easy).** While an arrow key is held, the player wears a different color: test the key with `kb.pressing(...)` (5.1.13) and set `player.color`.

**Challenge 2: an orbiting companion (medium).** A second sprite circles the player. Every frame, set its `pos.x` to `player.pos.x + cos(frameCount * 0.05) * 60`, and its `pos.y` the same way with `sin` (5.1.22).

**Challenge 3: show a value (easy).** Draw one of the player's values on the canvas with `text()` (5.1.21), joining words and a number with `+`. Wrap the number in `round()`, which gives the nearest whole number, so it does not print a long tail like `304.99999999999966`: for example `text('x: ' + round(player.pos.x), 10, 20);`. (`Math.round()` does the same thing.)

**Challenge 4: a HUD (medium).** At the top of the canvas, show `'Frame: ' + frameCount` on one line and the player's x and y on the next, one `text()` call per line. Use `round()` on x and y, as in Challenge 3.

**Challenge 5: a wave (medium).** A sprite that bobs up and down on its own: every frame, set its `pos.y` to a middle value plus `sin(frameCount * 0.05) * 80`, the way 5.1.22's mover swings sideways.

**Your own idea.** Something else beyond a canvas, a sprite and a background counts too. Two that work: a player that spins, with `player.rotation = frameCount * 2;` in `draw()` or `player.rotationSpeed = 3;` once in `setup()` (5.1.22), or a fading trail: write `background('rgba(34, 34, 34, 0.1)')` in place of `background('#222')`. The last number makes each frame's paint only 10% solid, so the old frames fade out slowly behind a moving sprite instead of vanishing at once (moSHion docs: Background and clearing).

Doing more than one challenge is fine: the check needs only one.
