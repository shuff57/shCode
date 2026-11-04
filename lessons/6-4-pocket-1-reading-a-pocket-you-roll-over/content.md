## A pocket is not a wall

A pocket drawn as a normal sprite is solid: the ball bounces off it. A pocket has to be
something the ball **rolls over**:

```js
pocket.collider = 'none';
```

A `'none'` sprite blocks nothing and has no gravity.

## Overlap is true every frame

`ball.overlaps(pocket)` is true on **every** frame the two overlap, not once. So the drop has
to be guarded: a flag, a moved ball, or deleting the ball.

```js
if (ball.overlaps(pocket) && ball.speed < 1) {
  ball.speed = 0;
  ball.x = pocket.x;
  ball.y = pocket.y;
  sunk = true;
}
```

**A fast ball rolls over a pocket** in real pool, and the speed test is what makes that true here.
