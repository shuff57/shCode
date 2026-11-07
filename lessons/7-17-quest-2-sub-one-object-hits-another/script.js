// 7.17.2 Sub-build: One object hits another.
// Two dummies. Press 1: the left one hits the right one, and a moment later
// the right one hits back. A method can take another object and change it.

class Dummy {
  constructor(name, hp, power) {
    this.name = name;
    this.hp = hp;
    this.power = power;
  }

  isAlive() {
    return this.hp > 0;
  }

  // STEP: takeHit(n) loses n hp, never below 0.
  // STEP: hit(other) makes the other dummy take a hit of this dummy's power.
}

let left;
let right;
let note = 'Press 1';

function setup() {
  new Canvas(400, 160);
  left = new Dummy('Left', 20, 4);
  right = new Dummy('Right', 20, 3);
}

function draw() {
  background('#1b1d2a');
  // STEP: when 1 is pressed and both are alive, left hits right;
  // 45 frames later, right hits back if it is still alive.
}

function drawTop() {
  text(left.name + ': ' + left.hp + '    ' + right.name + ': ' + right.hp, 20, 60, 18, 'white');
  text(note, 20, 100, 14, 'gold');
}
