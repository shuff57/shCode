// 7.18.2 Sub-build: A flag and a count inside an object.
// 1 takes a hit of 6 to try it out. Next: 2 will guard (the next hit is halved)
// and 3 will drink a potion while any are left.

class Knight {
  constructor() {
    this.hp = 30;
    this.maxHp = 30;
    this.potions = 2;
    this.guarding = false;
  }

  takeHit(n) {
    // STEP: while guarding, the hit is halved, rounded down, and any hit ends the guard.
    this.hp = max(this.hp - n, 0);
    return n;
  }

  // STEP: guard() turns the flag on.
  // STEP: heal() drinks a potion while any are left: up to 12 hp back, never above
  // maxHp. It returns the hp it gave back.
}

let k;
let note = '1 take a hit, 2 guard, 3 potion';

function setup() {
  new Canvas(400, 160);
  k = new Knight();
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('1')) note = 'Took ' + k.takeHit(6);
  // STEP: 2 guards, and 3 drinks a potion.
}

function drawTop() {
  text('hp ' + k.hp + '/' + k.maxHp + '   potions ' + k.potions + (k.guarding ? '   GUARDING' : ''), 20, 60, 16, 'white');
  text(note, 20, 100, 14, 'gold');
}
