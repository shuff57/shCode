## Aiming is rotation

The arm is a bar with `collider = 'none'`: it blocks nothing, it just shows where the shot
will go. Its `.rotation` is in degrees, and `angleTo` gives the angle to a point:

```js
arm.rotation = arm.angleTo(mouse.x, mouse.y);
```

**Up on screen is -90.** A catapult should not point into the ground, so clamp it:

```js
arm.rotation = constrain(arm.angleTo(mouse.x, mouse.y), -170, -10);
```

## Turning at a speed

`rotateTo(angle, 4)` turns at most 4 degrees a frame toward the angle, so the arm swings
instead of snapping. It takes two numbers: where to go, and how fast. Use it when you want the
catapult to feel heavy.

```js
arm.rotateTo(mouse.x, mouse.y, 4);
```

The shot leaves along the arm's rotation, so the arm is the aim.
