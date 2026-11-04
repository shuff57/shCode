## The whole shot

Read it once, then run it. It is the previous two labs joined: the line shows the pull while the
button is held, and the release turns the pull into direction and speed.

```js
let cue;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  cue = new Sprite(200, 200, 22);
  cue.collider = 'none';
  cue.color = 'white';
}

function draw() {
  background('green');

  if (mouse.pressing()) {
    stroke('white');
    line(cue.x, cue.y, mouse.x, mouse.y);
    noStroke();
    text(round(dist(cue.x, cue.y, mouse.x, mouse.y)), 12, 24);
  }

  if (mouse.released()) {
    const power = min(dist(cue.x, cue.y, mouse.x, mouse.y), 120);
    cue.direction = cue.angleTo(mouse.x, mouse.y) + 180;
    cue.speed = power / 12;
  }

  text('speed ' + round(cue.speed, 1), 12, 44);
}
```

**What to notice.** The ball keeps moving after the release, because nothing slows it yet.
That is the next module's problem.
