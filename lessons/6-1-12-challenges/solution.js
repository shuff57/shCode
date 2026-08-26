// 2.3.12 Challenges: reference solution.
// Combines all three Groups stretches: Challenge 1 (lives counter via a
// rocks Group), Challenge 2 (varied-size/value apples driven by Math.random),
// Challenge 3 (`cull()` helper replacing the manual backwards loop).
// Any one of the three is enough to pass the grader.

let basket;
let apples, rocks;
let score = 0;
let lives = 3;

function setup() {
  new Canvas(400, 400);

  basket = new Sprite(200, 370, 60, 16);
  basket.color = 'saddlebrown';
  basket.collider = 'static';

  apples = new Group();
  apples.color = 'red';
  apples.diameter = 20;
  apples.collider = 'none';

  rocks = new Group();
  rocks.color = 'gray';
  rocks.diameter = 22;
  rocks.collider = 'none';
}

function draw() {
  background('#222');

  // Basket follows the mouse along x.
  basket.x = mouseX;

  // Challenge 2: spawn apples with varied size, varied score.
  if (frameCount % 30 === 0) {
    let a = new apples.Sprite(20 + Math.random() * 360, -20);
    a.diameter = 12 + Math.random() * 24;
    a.value = Math.round(a.diameter / 4);
    a.vel.y = 3;
  }

  // Challenge 1: rocks spawn slower and cost a life on contact.
  if (frameCount % 90 === 0) {
    let r = new rocks.Sprite(20 + Math.random() * 360, -20);
    r.vel.y = 2;
  }

  // Catch apples → score.
  basket.overlaps(apples, (b, apple) => {
    score += apple.value;
    apple.delete();
  });

  // Hit by a rock → lose a life.
  basket.overlaps(rocks, (b, rock) => {
    lives--;
    rock.delete();
  });

  // Challenge 3: single helper handles off-screen cleanup for every Group.
  cull(apples);
  cull(rocks);

  // HUD.
  fill('white');
  textSize(16);
  text('Score: ' + score, 12, 24);
  text('Lives: ' + lives, 12, 44);

  if (lives <= 0) {
    fill('red');
    textSize(32);
    text('Game Over', 110, 200);
    noLoop();
  }
}

function cull(group) {
  for (let s of [...group]) {
    if (s.x < -50 || s.x > width + 50 || s.y < -50 || s.y > height + 50) {
      s.delete();
    }
  }
}
