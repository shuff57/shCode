// 7.19.2 Sub-build: A list of kinds becomes a list of objects.
// KINDS is data: plain { name, hp } objects. Today map turns each one into a
// new Monster, and N moves on to the next one in the list.

const KINDS = [
  { name: 'Bat', hp: 6 },
  { name: 'Wolf', hp: 14 },
  { name: 'Troll', hp: 30 },
];

class Monster {
  constructor(name, hp) {
    this.name = name;
    this.hp = hp;
  }
}

let monsters;
let which = 0;

function setup() {
  new Canvas(400, 160);
  // STEP: make one Monster for every kind in KINDS, with map, in place of this one.
  monsters = [new Monster('Bat', 6)];
}

function draw() {
  background('#1b1d2a');
  // STEP: N moves on to the next monster, and stops at the last one.
}

function drawTop() {
  const m = monsters[which];
  text('Monster ' + (which + 1) + ' of ' + monsters.length + ': ' + m.name + ' (' + m.hp + ' hp)', 20, 60, 16, 'white');
  text('N: next', 20, 100, 14, 'gold');
}
