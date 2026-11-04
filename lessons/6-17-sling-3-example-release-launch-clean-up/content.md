## Launch, then clean up

The whole shot, with the part the next module is about already in place:

```js
let arm, shots = [];

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;
  arm = new Sprite(100, 230, 80, 12);
  arm.collider = 'none';
  arm.color = 'sienna';
}

function draw() {
  background('skyblue');
  arm.rotation = constrain(arm.angleTo(mouse.x, mouse.y), -170, -10);

  if (mouse.released()) {
    const shot = new Sprite(arm.x + 40, arm.y - 20, 18);
    shot.color = 'gray';
    shot.direction = arm.rotation;
    shot.speed = 9;
    shots.push(shot);
  }

  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    if (s.x < -20 || s.x > width + 20 || s.y > height + 20) {
      s.delete();
      shots.splice(i, 1);
    }
  }

  text('in the air: ' + shots.length, 12, 24);
}
```

**Watch the number.** It goes up by one per click and back to zero when the stones leave. If it
only goes up, the splice is missing.
