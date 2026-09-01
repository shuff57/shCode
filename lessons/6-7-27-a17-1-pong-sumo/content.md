## A17.1 Two-Player Pong-Sumo

### Assignment overview

This is the capstone lab for Units 6.7 and 6.8. You've built paddles (6.7.16), learned joints (6.8.2–6.8.6), and practiced two-player input (6.7.13). Now you put it all together into a real two-player game.

Build a top-down Pong-Sumo game: two paddles, one ball, push the ball past the other player's side to score. First to 5 wins.

### Goal

Ship a complete two-player local game with:
- Two paddles responding to two separate key schemes
- A bouncy ball, no gravity
- A live score display
- A win condition
- At least one joint somewhere in the game

Your game should follow the state-machine pattern from Unit 6.6: **title → play → win → reset**. A teacher will confirm this during share-out.

### Requirements (all must be green to Submit)

| # | What you need | Plain-English description |
|---|--------------|--------------------------|
| 1 | Two-player keyboard input | `kb.pressing(...)` is called with keys for both players |
| 2 | Independent score variables | `p1Score` and `p2Score` (or similar) are declared at the top of the file |
| 3 | Bounciness is set | `.bounciness` is assigned on at least one sprite |
| 4 | No gravity | `world.gravity.y = 0` appears in your setup |
| 5 | Score is rendered | `text(...)` displays `p1Score` or `p2Score` on screen inside `draw()` |
| 6 | Win condition | A comparison against a number (e.g. `>= 5`) triggers the win state |
| 7 | At least one joint | A `new DistanceJoint(...)` or `new HingeJoint(...)` is created somewhere |

**Teacher-checked (not auto-graded):** your game uses a state machine: title screen, play state, win screen, and a way to reset. This is the 6.6.13 pattern applied to a two-player game.

### Suggested approach

1. **Get the arena working first.** Canvas, `world.gravity.y = 0`, top and bottom wall sprites. Make sure the ball bounces off the walls before you add anything else.
2. **Add one paddle at a time.** Player 1 (WASD) on the left, Player 2 (arrow keys) on the right. Get both moving before wiring the ball.
3. **Add the score zones.** When the ball crosses the left edge, Player 2 scores. Right edge, Player 1 scores. Reset the ball to center after each score.
4. **Add the win condition and wrap in a state machine.** Title screen, play, win screen with a reset key.
5. **Add a joint last.** A `DistanceJoint` chain along the top and bottom edges (linking wall segments together) is the simplest fit. Or add a moving obstacle in the middle. Your choice: the criterion is just that a joint is used somewhere.

### API tips and common pitfalls

- **`joint.delete()`**: that's how you remove a joint at runtime. There is no `joint.remove()`.
- **Set joint length after construction**: `new DistanceJoint(a, b)` first, then `joint.length = 100` on the next line. You cannot pass length as a third constructor argument.
- **`new DistanceJoint(a, b)`** links two sprites with a fixed-length tether. Both sprites need to already exist.
- **`new HingeJoint(a, b)`** creates a rotational pivot. One sprite is usually `collider = 'static'`.
- **`kb.pressing` vs `kb.presses`**: `pressing` is true every frame the key is held; `presses` is true only on the frame you first press it. Use `pressing` for movement, `presses` for state transitions.
- **Arrow key names**: use `'up'`, `'down'`, `'left'`, `'right'` (lowercase strings), not `'ArrowUp'`.
- **Keep bounciness between 0 and 1.** Values above 1 add energy and the ball accelerates forever.

### How to submit

Build your game step by step. The auto-grader runs against your `script.js` every time you commit. When all 7 requirement cards are green, the Submit button unlocks. Your teacher will also check the state-machine flow during share-out.

Start with the arena. Get each piece working before moving to the next. Good luck.
