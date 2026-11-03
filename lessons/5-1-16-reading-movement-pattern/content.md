## Movement Pattern (if / else if / else)

Read before `5.1.17 Reading: The else-to-zero rule`. About 5 minutes.

By the end of this reading you should be able to answer:

- Why does the movement code go inside `draw()` and not `setup()`?
- What is the role of the `else if` branch compared with the first `if`?
- What would happen if you used two separate `if` blocks instead of `if / else if`?

You know how to set `vel.x` to move a sprite, and you know `kb.pressing(key)` returns `true` while a key is held. This reading combines them into a complete, reusable movement pattern.

**What you'll learn from it:**

- The pattern belongs in `draw()` because it runs once per frame: the only place you can react to live key input.
- An `if / else if / else` chain means **exactly one branch runs** per frame: the left one, the right one, or the `else`. Because they are one chain, the final `else` runs only when **neither** key is held.
- A velocity stays until your code changes it. So every frame that no key is held, something has to set it back to `0`, or the sprite keeps sliding after you let go. The `else` at the end of the chain is that line. With two separate `if` lines and no `else`, nothing ever sets it back. And an `else` belongs only to the `if` right above it, so it has to end the whole chain. The next reading covers both in detail.
- Velocity values of 2–6 give good feel; the pattern works identically regardless of the specific number.

**Try it:**

```js live
let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if      (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x =  4;
  else                       player.vel.x =  0;

  if      (kb.pressing('w')) player.vel.y = -4;
  else if (kb.pressing('s')) player.vel.y =  4;
  else                       player.vel.y =  0;
}
```

**What you'll see:** a blue square in the center. Click the preview to focus it, then hold A, D, W, or S: the sprite moves. Two `if / else if / else` chains handle horizontal and vertical independently.

**Try this:** change the `4`s to `2`. Notice the sprite is slower and easier to stop precisely. Change them to `8`: it gets harder to control. That range of 2–6 is the sweet spot for this kind of movement.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`if / else if / else`** | A chain where exactly one branch runs each frame. The final `else` runs only when no key in the chain is held, so it is where the speed goes back to `0`. |
| **`draw()` for input** | Input checks belong in `draw()` because `draw()` runs every frame; `setup()` runs only once at startup. |
