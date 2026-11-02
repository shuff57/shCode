## A ship, and a timer you start yourself

**Read before `5.9.3 Worked Example: Fire with a cooldown`.** About 8 minutes.

By the end of this reading you should be able to answer:

- How do two ifs keep a sprite on the canvas?
- Why does holding Space with `kb.pressing` fire far too fast, and why is `kb.presses` no fix?
- What is a cooldown, and how is it different from the `frameCount` beat?
- Why does game over need no freeze code in this game?

**The ship moves by hand.** The ship is a `'static'` sprite, so nothing pushes it and gravity does not pull it. It moves only because the code sets its `x`, the way the block in 5.5.3 moved only when its `x` was set. Five pixels a frame while an arrow is held:

```js
if (kb.pressing('left')) ship.x -= 5;
if (kb.pressing('right')) ship.x += 5;
```

**Two ifs keep it on the canvas.** Hold left for long enough and `x` keeps falling, past 0 and off the screen. Nothing stops it unless the code does. A sprite's `x` is its centre and the ship is 36 pixels wide, so its centre should stay between 20 and 380. Each if puts it back on the line it crossed:

```js
if (ship.x < 20) ship.x = 20;
if (ship.x > 380) ship.x = 380;
```

This is called **clamping**: the number moves freely inside the range and is held at the edge when it tries to leave. Both ifs run on every frame, after the move, so the ship never spends a frame off the screen.

**Holding Space fires sixty shots a second.** `kb.pressing('space')` is true on every frame the key is down: it is level-triggered, the word 5.3.5 used for `colliding()`. If the code fires whenever it is true, a held key makes one shot per frame: sixty a second, a solid yellow line. `kb.presses('space')` is true only on the frame the key goes down, so it fires once per press, and now the player has to hammer the key to keep shooting. Neither is what a shooter wants. It wants "fire while Space is held, but no more than five a second".

**A cooldown.** A cooldown is a number you set when something happens and count down by 1 on every frame. The action is allowed only when it has reached 0. These are the lines that do it for the shots, with the lines that build the shot sprite left out:

```js
if (cooldown > 0) cooldown -= 1;           // count down, stop at 0
if (kb.pressing('space') && cooldown === 0) {
  // ...build the shot and push it onto bullets...
  cooldown = 12;                           // the next shot must wait 12 frames
}
```

Read it frame by frame. A shot is fired and `cooldown` becomes 12. On the next frames it counts 11, 10, 9 ... and the `if` stays shut even though Space is held. On the frame it reaches 0 the next shot fires and it goes back to 12. So a cooldown of 12 means one shot every 12 frames at most: **at most 5 shots a second** (60 / 12). Let go of Space and the count still runs down to 0 and waits there, so the first shot after a pause comes the moment you press.

**A cooldown is not a beat.** You met the beat in 5.2.1: `frameCount % 12 === 0` is true on every 12th frame. Both give a 12-frame gap, but they start counting at different times:

| | A beat: `frameCount % 12 === 0` | A cooldown: `cooldown = 12` |
| --- | --- | --- |
| starts counting | when the game starts, and ticks for ever | when you set it, at the moment of the shot |
| between ticks | runs whether or not anything happened | counts down from the last shot |
| the first shot after a pause | waits for the next tick, up to 11 frames | fires at once |
| good for | things on a steady clock: pipes, food, enemies | an action that must rest after it happens |

The beat is a clock on the wall. The cooldown is a timer you start yourself.

**Everything moves by hand, inside `if (playing)`.** In this game nothing has a speed of its own. The ship moves because its `x` is set. Every shot climbs because a loop does `bullets[i].y -= 8` on every frame, and the drone you will meet in 5.9.5 falls because `drone.y += 1.5` runs on every frame. All of those lines sit inside one `if`:

```js
function draw() {
  background('#111');

  if (playing) {
    moveShip();
    fire();
    moveBullets();
  }
}
```

When the round ends, `playing` becomes `false` and every line that moves something stops running, so nothing needs freezing. Compare 5.4.8 (Lab: Crash, and start again): the bird fell under gravity and the pipes slid by their own `vel.x`, so a crash also had to set gravity to 0 and every pipe's speed to 0. Moving by hand costs one line per thing, and buys a game over that is a single `playing = false`.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **clamp** | hold a number inside a range: two ifs put it back on whichever edge it crossed |
| **cooldown** | a number set when something happens and counted down by 1 each frame; the action waits until it is 0 |
| **beat** | `frameCount % n === 0`: true every `n` frames, whatever happened |
