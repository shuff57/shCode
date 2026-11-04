## Two numbers describe any motion

- `.direction` is an angle in degrees: 0 is right, 90 is **down** on screen.
- `.speed` is how many pixels the sprite moves each frame.
- Setting one does not change the other.

```js
cue.direction = cue.angleTo(mouse.x, mouse.y);  // face the pointer
cue.speed = 4;                                   // and move that way
```

## A pull-back is the opposite way

If the line goes from the ball to the pointer, the shot goes **away** from the pointer:
`angleTo(...) + 180`. Power is the length of the pull, `dist(ball, pointer)`, capped with
`min` so a long drag is not a rocket:

```js
const power = min(dist(cue.x, cue.y, mouse.x, mouse.y), 120);
cue.direction = cue.angleTo(mouse.x, mouse.y) + 180;
cue.speed = power / 12;
```

10-12 pixels of speed is a firm shot; 2 is a gentle roll.
