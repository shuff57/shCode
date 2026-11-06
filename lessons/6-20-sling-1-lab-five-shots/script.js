// 6.20.1 Lab: Five shots, win or lose.
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
  // STEP: spend a shot, win, lose, R.
}
