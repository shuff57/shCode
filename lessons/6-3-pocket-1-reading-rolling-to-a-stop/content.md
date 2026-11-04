## Drag is the felt

On a table seen from above there is no ground to rub against, so `.drag` bleeds the speed:

```js
cue.drag = 0.02;
```

Drag is applied every frame, so the ball slows a little each frame and never quite reaches zero.

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

`new Walls()` makes four edges in one line, after `new Canvas()`, and `walls.left` and the
other three names let you change them.
