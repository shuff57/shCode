// Sub-build: one object hits another. Press 1: the left dummy hits the right
// one. A method can take another object and change it; hp never drops below 0.
// 45 frames later (after) the right one hits back.

class Dummy {
  constructor(name, hp, power) {
    this.name = name;
    this.hp = hp;
    this.power = power;
  }

  isAlive() {
    return this.hp > 0;
  }

  takeHit(n) {
    this.hp = max(this.hp - n, 0);
  }

  hit(other) {
    other.takeHit(this.power);
  }
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
  if (kb.presses('1') && left.isAlive() && right.isAlive()) {
    left.hit(right);
    note = 'Left hits Right';
    after(45, () => {
      if (right.isAlive()) {
        right.hit(left);
        note = 'Right hits back';
      }
    });
  }
}

function drawTop() {
  text(left.name + ': ' + left.hp + '    ' + right.name + ': ' + right.hp, 20, 60, 18, 'white');
  text(note, 20, 100, 14, 'gold');
}
