## Drag is the felt

On a table seen from above there is no ground to rub against, so `.drag` bleeds the speed:

```js
cue.drag = 1;
```

The number is how hard the felt pulls. Drag is applied every frame, so the ball loses a slice of
its speed each frame and never quite reaches zero: at `1` it keeps about a third of its speed
after a second, so a soft shot is down to a crawl in two or three. A bigger number is a shorter
roll (sand, not felt); `0.02` is so nearly frictionless that the ball would cross the whole table
and still be moving.

## "Stopped" is a threshold

Because it never reaches exactly zero, `speed === 0` is never true. A ball is stopped when its
speed is under a small number:

```js
if (cue.speed < 0.2) {
  cue.speed = 0;
}
```

Then "shoot only when stopped" is one `if`, and counting shots is one `shots += 1` inside the
release branch.

## The rails

The rails you built in 6.1.4 are still the edge of the table: `new Walls()` makes four static
sprites just outside the canvas, and `walls.left`, `walls.right`, `walls.top` and
`walls.bottom` name them. The ball is solid, so the rails can stop it; drag is what slows it
down before it gets there.
