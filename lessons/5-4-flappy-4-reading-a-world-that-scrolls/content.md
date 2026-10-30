## A world that scrolls

**Read before `5.4.6 Lab: Pipes that come and go`.** About 8 minutes.

By the end of this reading you should be able to answer:

- Which thing moves in a side-scrolling game: the bird or the world?
- How does a game build a new obstacle every second or so?
- Why do obstacles that have left the screen have to be deleted?

**The bird stays put.** In this game the bird's `x` never changes. What the player sees as flying forward is the pipes sliding left. That is simpler than it sounds: each pipe gets a leftward speed once, and the engine keeps moving it.

```js
const pipe = new Sprite(440, 100, 50, 200, 'kinematic');
pipe.vel.x = -2;
```

A `'kinematic'` sprite moves under its own speed, ignores gravity, and still collides with the bird. A `'static'` one would never move at all.

**New pipes on a timer.** `frameCount` counts frames since the game started, as 5.2.1 showed. The remainder operator `%` turns it into a repeating beat:

```js
if (frameCount % 90 === 0) {
  // runs on frame 90, 180, 270 ... about every 1.5 seconds
}
```

**Keep every pipe in an array.** There will be many pipes alive at once, so each one is added to an array when it is built, the way the bumpers were in 5.3.8. The array is how the game finds them again.

```js
pipes.push(makePipe());
```

**Delete what has left.** A pipe that has slid off the left edge is still a sprite. It is still tracked, still collided, and still costs time on every frame. After a few minutes there are hundreds. So each frame, look at the pipes and remove the ones that are gone:

```js
for (let i = pipes.length - 1; i >= 0; i--) {
  if (pipes[i].x < -30) {
    pipes[i].mate.delete();     // the bottom half
    pipes[i].delete();          // the top half
    pipes.splice(i, 1);         // take it out of the array
  }
}
```

**Why the loop runs backwards.** `splice` removes an item and every later item shifts down by one. Counting upwards, the loop would skip the item that slid into the gap. Counting downwards, the items still to be visited are never moved.

**Two things have to go.** Deleting the sprite takes it off the screen. Splicing takes it out of the array. Do only the first and the array keeps pointing at a sprite that no longer exists.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **kinematic** | a body that moves by its own speed, ignores gravity and still collides |
| **frameCount** | how many frames have run since the game began |
| **%** | the remainder after dividing; `frameCount % 90` repeats 0 to 89 |
| **splice(i, 1)** | removes one item from an array at position `i` |
