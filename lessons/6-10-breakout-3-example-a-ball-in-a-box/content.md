## A ball in a box

**Read before `6.10.4 Lab: The paddle`.** About 10 minutes.

Everything from the last reading, in one sketch. Press Run and move the mouse over the canvas to move the paddle. Keep the ball in play.

```js live
// A ball in a box. Move the mouse to move the paddle.
const R = 6;            // the ball's radius: half of its 12-pixel width
const PADDLE_W = 80;    // the paddle is 80 pixels wide

let paddle, ball;
let vx = 3;             // pixels per frame across: + is right, - is left
let vy = -4;            // pixels per frame down: + is down, - is up
let bounces = 0;

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
  ball = new Sprite(200, 300, R * 2);
  ball.collider = 'none';   // nothing pushes the ball: this code moves it
  ball.color = 'gold';
}

function draw() {
  background('#111');

  // The paddle follows the mouse, and stays on the screen.
  paddle.x = mouse.x;
  if (paddle.x < PADDLE_W / 2) paddle.x = PADDLE_W / 2;
  if (paddle.x > 400 - PADDLE_W / 2) paddle.x = 400 - PADDLE_W / 2;

  // Move the ball one step.
  ball.x += vx;
  ball.y += vy;

  // A bounce is a flipped sign. x is the ball's CENTRE, so it touches a wall at R, not 0.
  if (ball.x < R || ball.x > 400 - R) vx = -vx;
  if (ball.y < R) vy = -vy;

  // The paddle: only while the ball is coming down, then steer by where it landed.
  if (ball.overlaps(paddle) && vy > 0) {
    vy = -vy;
    vx = (ball.x - paddle.x) / 10;
    bounces += 1;
  }

  // The bottom is open. A lost ball comes back to the middle.
  if (ball.y > 400 + R) {
    ball.x = 200;
    ball.y = 300;
    vx = 3;
    vy = -4;
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('vx: ' + round(vx, 1) + '   vy: ' + vy, 12, 24);
  text('paddle bounces: ' + bounces, 12, 48);
}
```

**What you'll see:** a white paddle that follows the mouse along the bottom, and a gold ball that bounces off the left wall, the right wall and the top. When it lands on the paddle it goes back up. Miss it and it comes back in the middle. The top line shows the ball's two speeds, and the second counts the paddle bounces.

**Try this:**

1. Catch the ball on the left end of the paddle, then on the right end, then in the middle, and watch `vx` on the top line each time. The left end makes it negative (the ball leaves to the left), the right end positive, and the middle close to 0 (nearly straight up).
2. Delete the line `vx = (ball.x - paddle.x) / 10;` and press Run. Now `vx` is only ever 3 or -3: whatever you do with the paddle, the ball flies at the same angle, back and forth on the same path. Put the line back.
3. In the wall test, change `ball.x < R || ball.x > 400 - R` to `ball.x < 0 || ball.x > 400` and press Run. The ball now goes half into each side wall before it turns, because `ball.x` is its centre. Put `R` back.
4. Change the `/ 10` in the steering line to `/ 4`. The ends of the paddle now throw the ball off almost sideways. Put it back to `/ 10`.

**What each Try found.** Try 1: where the ball lands on the paddle decides which way it leaves. Try 2: without the steering line the player cannot aim, and every rally is the same. Try 3: the wall tests use `R` because x is the centre of the ball, not its edge. Try 4: the number you divide by sets how hard the ends of the paddle steer.
