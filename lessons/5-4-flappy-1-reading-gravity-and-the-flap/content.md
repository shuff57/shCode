## Gravity and the flap

**Read before `5.10.3 Worked Example: The bird that flaps`.** About 6 minutes.

By the end of this reading you should be able to answer:

- What keeps pulling the bird down, and what lifts it?
- Why does the flap *set* the bird's speed instead of adding to it?
- Why must the flap use `kb.presses` rather than `kb.pressing`?

The second game has one rule: the bird always falls, and you decide when it rises. The falling is free. `world.gravity.y` pulls every dynamic sprite down on every frame, exactly as it did for the pinball ball.

```js
world.gravity.y = 20;      // always on, for the whole game
```

**The flap is one sudden change to the bird's speed.** A flap does not push the bird for a while. It is a single moment where the upward speed becomes a fixed number, and then gravity takes over again and bends the path back down:

```js
if (kb.presses(' ')) {
  bird.vel.y = -4;         // negative y is up
}
```

**Set it, do not add to it.** Compare these two lines:

```js
bird.vel.y = -4;      // the bird leaves at exactly 4 up, however fast it was falling
bird.vel.y -= 4;      // the bird leaves at 4 faster than before
```

If the bird is falling hard, `-= 4` only slows the fall. `= -4` always gives the same flap, which is what a player's thumb expects.

**Why `presses`.** 5.2.12 told the difference between a key being held and a key just going down. A held key with `kb.pressing` would reset the speed on every frame, so the bird would climb at one steady speed for as long as the key is held and never fall. `kb.presses` fires once when the key goes down, so one tap is one flap.

| | Fires | Flappy feel |
| --- | --- | --- |
| `kb.presses(' ')` | once, when the key goes down | one tap, one flap |
| `kb.pressing(' ')` | every frame the key is held | the bird climbs steadily and cannot fall |

**Two numbers tune the whole game.** The size of the gravity and the size of the flap together set how it feels. Raise gravity and the bird drops quickly, so a flap has to be bigger to keep up. Change one without the other and the game is either floaty or impossible.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **impulse** | one sudden change to a speed, rather than a push that lasts |
| **vel.y** | the bird's vertical speed; negative means up |
