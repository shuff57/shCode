// 3.3.12 Example — Procedural vs OOP 3D
//
// HOW TO USE: The OOP version is active below.
// To compare, comment out the OOP section and un-comment the PROCEDURAL section.
// Both produce exactly the same scene.
// Modify the code freely — click Refresh to reset.

// ============================================================
// PROCEDURAL version (comment this section OUT to see OOP)
// ============================================================
/*
let cube1, cube2, cube3;
let speed1 = 0.01, speed2 = 0.02, speed3 = 0.03;

function setup() {
  cube1 = new Cube(-3, 0, 0);  cube1.color = 'deepskyblue';
  cube2 = new Cube( 0, 0, 0);  cube2.color = 'gold';
  cube3 = new Cube( 3, 0, 0);  cube3.color = 'tomato';
}

function draw() {
  background('#111');
  cube1.rotation.y += speed1;
  cube2.rotation.y += speed2;
  cube3.rotation.y += speed3;
}
*/

// ============================================================
// OOP version (active — comment this section OUT to see procedural)
// ============================================================
class Spinner {
  constructor(x, color, speed) {
    this.shape = new Cube(x, 0, 0);
    this.shape.color = color;
    this.speed = speed;
  }

  update() {
    this.shape.rotation.y += this.speed;
  }
}

let spinners = [];

function setup() {
  spinners.push(new Spinner(-3, 'deepskyblue', 0.01));
  spinners.push(new Spinner( 0, 'gold',        0.02));
  spinners.push(new Spinner( 3, 'tomato',      0.03));
}

function draw() {
  background('#111');
  for (let s of spinners) s.update();
}
