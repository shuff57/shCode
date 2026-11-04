## Make a sprite on release

A shot does not exist until you launch it. On `mouse.released()`, make one at the arm and send
it along the arm's rotation:

```js
if (mouse.released()) {
  const shot = new Sprite(arm.x, arm.y, 18);
  shot.color = 'gray';
  shot.direction = arm.rotation;
  shot.speed = 9;
  shots.push(shot);
}
```

- `direction` is degrees, the same as the arm's rotation, so the shot leaves where you aimed.
- `speed` is pixels a frame. Gravity pulls it down after that, so the path is an arc, not a line.
- Make it **once per release**, never in `draw()` on its own, or you launch 60 stones a second.

## The list is the game

`shots.push(shot)` is what lets you clean up later. Every shot in the air is one entry, and the
next module is about taking them out again.
