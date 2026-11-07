// Sub-build: a flag and a count inside an object. 2 guards (the next hit is
// halved), 3 drinks a potion while any are left, 1 takes a hit of 6 to try it.

class Knight {
  constructor(potions) {
    this.hp = 30;
    this.maxHp = 30;
    this.potions = potions;
    this.guarding = false;
  }

  takeHit(n) {
    if (this.guarding) n = floor(n / 2);
    this.guarding = false;
    this.hp = max(this.hp - n, 0);
    return n;
  }

  guard() {
    this.guarding = true;
  }

  heal() {
    if (this.potions === 0) return 0;
    this.potions -= 1;
    const before = this.hp;
    this.hp = min(this.hp + 12, this.maxHp);
    return this.hp - before;
  }
}

let k;
let note = '1 take a hit, 2 guard, 3 potion';

function setup() {
  new Canvas(400, 160);
  k = new Knight(2);
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('1')) note = 'Took ' + k.takeHit(6);
  if (kb.presses('2')) { k.guard(); note = 'Guarding'; }
  if (kb.presses('3')) note = 'Potion: +' + k.heal();
}

function drawTop() {
  text('hp ' + k.hp + '/' + k.maxHp + '   potions ' + k.potions + (k.guarding ? '   GUARDING' : ''), 20, 60, 16, 'white');
  text(note, 20, 100, 14, 'gold');
}
