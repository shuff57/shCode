// Sub-build: a list of kinds becomes a list of objects. map turns each plain
// { name, hp } into a new Monster; N moves on to the next one in the list.

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
  monsters = KINDS.map((k) => new Monster(k.name, k.hp));
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('n') && which < monsters.length - 1) which += 1;
}

function drawTop() {
  const m = monsters[which];
  text('Monster ' + (which + 1) + ' of ' + monsters.length + ': ' + m.name + ' (' + m.hp + ' hp)', 20, 60, 16, 'white');
  text('N: next', 20, 100, 14, 'gold');
}
