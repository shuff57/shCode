// 2.2.11 Collectible Class: reference solution.
// Hidden from students; only loaded for admin/teacher via /api/lesson-solution.

class Collectible {
  constructor(x, y, value, color) {
    this.value = value;
    this.sprite = new Sprite(x, y, 20, 20);
    this.sprite.color = color;
    this.sprite.collider = 'none';
  }

  collect() {
    this.sprite.delete();
    return this.value;
  }
}

let player;
let collectibles = [];
let totalScore = 0;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 30, 30);
  player.color = 'white';

  collectibles.push(new Collectible(80,  80,  1,  'yellow'));
  collectibles.push(new Collectible(320, 80,  2,  'cyan'));
  collectibles.push(new Collectible(80,  320, 3,  'magenta'));
  collectibles.push(new Collectible(320, 320, 5,  'lime'));
  collectibles.push(new Collectible(200, 60,  10, 'orange'));
}

function draw() {
  background('#222');

  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                         player.vel.x = 0;
  if (kb.pressing('w'))       player.vel.y = -4;
  else if (kb.pressing('s'))  player.vel.y = 4;
  else                         player.vel.y = 0;

  // Iterate a copy so .splice() during the loop doesn't skip neighbours.
  for (let c of [...collectibles]) {
    if (player.overlaps(c.sprite)) {
      totalScore += c.collect();
      collectibles.splice(collectibles.indexOf(c), 1);
    }
  }

  fill('white');
  textSize(16);
  text('score: ' + totalScore, 12, 24);
}
