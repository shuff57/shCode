## Fire with a cooldown

**Read before `7.4.4 Lab: Fly and fire`.** About 8 minutes.

Click the canvas first, so the sketch hears your keys, then hold Space. The ship fires, but only when `cooldown` has counted down to 0, and every shot sets it back to `COOLDOWN`. The two numbers at the top show the countdown and how many shots have gone.

```js live
// Hold Space. The cooldown decides how far apart the shots are.
const COOLDOWN = 12;   // try 0, 4 and 30

let ship, bullets, cooldown, fired;

function setup() {
  new Canvas(400, 300);
  ship = new Sprite(200, 270, 36, 18, 'static');
  ship.color = 'deepskyblue';
  bullets = [];
  cooldown = 0;
  fired = 0;
}

function draw() {
  background('#111');

  if (cooldown > 0) cooldown -= 1;
  if (kb.pressing('space') && cooldown === 0) {
    const b = new Sprite(ship.x, ship.y - 18, 6, 14);
    b.collider = 'none';
    b.color = 'yellow';
    bullets.push(b);
    fired += 1;
    cooldown = COOLDOWN;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= 8;
    if (bullets[i].y < -20) {
      bullets[i].delete();
      bullets.splice(i, 1);
    }
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('cooldown: ' + cooldown, 12, 24);
  text('shots fired: ' + fired, 12, 46);
}
```

**What you'll see:** while Space is held, a shot leaves every 12 frames, five a second, evenly spaced. Between two shots the number at the top runs 12, 11, 10 ... down to 1, then starts again at 12: on the frame it reaches 0 a shot goes and it is set back to 12 before the top is drawn. Let go and it settles at 0, so the next press fires at once.

**Try this:**

1. Change `COOLDOWN` to `0`. Every frame is a firing frame: a solid stream, sixty shots a second.
2. Change it to `4`, then to `30`. The gap between shots is the number you chose: fifteen shots a second, then two.
3. Put it back to `12` and delete the line `if (cooldown > 0) cooldown -= 1;`. One shot, then never again: the timer is set to 12 and nothing ever counts it down.
4. Hold Space and watch `shots fired`. The shots that leave the top are deleted and spliced out by the loop at the bottom of `draw()`, the same backwards loop Flappy used for its pipes, so however long you hold, only a few are ever on the screen at once.
