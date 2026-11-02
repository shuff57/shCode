## The bird that flaps

**Read before `5.4.4 Lab: Make it flap`.** About 8 minutes.

Press the space bar. Each tap sends the bird up, and gravity pulls it back.

```js live
let bird;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 20;

  bird = new Sprite(100, 200, 24);
  bird.color = 'gold';
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('tap space to flap', 20, 28);

  if (kb.presses(' ')) {
    bird.vel.y = -4;
  }

  if (bird.y > 400 || bird.y < 0) {
    bird.y = 200;
    bird.vel.y = 0;
  }
}
```

**What you'll see:** the bird drops from the middle. Each tap lifts it in a short arc. If it leaves the top or bottom it returns to the middle, which stands in for losing until 5.4.8.

**Try this:**

1. Change `world.gravity.y = 20` to `40` and tap. The same flap now barely holds the bird up.
2. Set the flap to `-8`. The bird now shoots nearly to the top of the screen on every tap.
3. Replace `kb.presses` with `kb.pressing` and hold the bar. The bird climbs at one steady speed and never falls, because the speed is reset to -4 on every frame. Keep holding and it leaves the top, comes back to the middle, and climbs again. Let go and it falls.
