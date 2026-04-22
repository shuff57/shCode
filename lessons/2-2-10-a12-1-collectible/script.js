// 2.2.10 Collectible Class — write the class, instantiate 5+, catch them.

class Collectible {
  constructor(x, y, value, color) {
    // STEP 1: store x, y, and value on this; create this.sprite; set color

  }

  collect() {
    // STEP 2: despawn the sprite and return this.value

  }
}

let player;
let collectibles = [];
let totalScore = 0;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 30, 30);
  player.color = 'white';

  // STEP 3: push at least 5 new Collectible(...) into the collectibles array

}

function draw() {
  background('#222');

  if (kb.pressing('left'))       player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else                            player.vel.x = 0;
  if (kb.pressing('up'))         player.vel.y = -4;
  else if (kb.pressing('down'))  player.vel.y = 4;
  else                            player.vel.y = 0;

  // STEP 4: for each collectible, if player.overlaps(c.sprite), collect and score

}
