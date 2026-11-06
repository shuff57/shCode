// 6.20.1 Lab: Five shots, win or lose (reference solution).
let base, arm, shots = [], blocks = [];
let shotsLeft = 5, won = false;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;
  base = new Sprite(100, 250, 80, 20, 'static');
  base.color = 'gray';
  arm = new Sprite(100, 210, 80, 12);
  arm.collider = 'none';
  arm.color = 'sienna';
  startRound();
}

function startRound() {
  for (const b of blocks) b.delete();
  for (const s of shots) s.delete();
  blocks = [];
  shots = [];
  for (let i = 0; i < 3; i++) {
    const b = new Sprite(300, 250 - i * 44, 44, 40);
    b.color = 'saddlebrown';
    b.mass = 2;
    b.hits = 2;
    blocks.push(b);
  }
  shotsLeft = 5;
  won = false;
}

function draw() {
  background('skyblue');
  text('shots ' + shotsLeft, 12, 24);

  arm.rotation = constrain(arm.angleTo(mouse.x, mouse.y), -170, -10);

  if (mouse.released() && shotsLeft > 0) {
    const shot = new Sprite(arm.x + 40, arm.y - 10, 18);
    shot.color = 'gray';
    shot.direction = arm.rotation;
    shot.speed = 9;
    shots.push(shot);
    shotsLeft -= 1;
  }

  for (let j = shots.length - 1; j >= 0; j--) {
    for (const b of blocks) {
      if (shots[j].overlaps(b)) {
        b.hits -= 1;
        shots[j].delete();
        shots.splice(j, 1);
        break;
      }
    }
  }
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].hits <= 0) {
      blocks[i].delete();
      blocks.splice(i, 1);
    }
  }
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    if (s.x < -20 || s.x > width + 20 || s.y > height + 20) {
      s.delete();
      shots.splice(i, 1);
    }
  }

  if (blocks.length === 0) won = true;

  if (won) text('You win', 170, 120);
  else if (shotsLeft === 0 && shots.length === 0) text('Out of shots', 150, 120);

  if (kb.presses('r')) startRound();
}
