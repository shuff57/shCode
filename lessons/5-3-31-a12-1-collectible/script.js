// 2.2.11 Collectible Class — write the class, instantiate 5+, catch them.

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

  // STEP 3: build at least 5 collectibles and put them in the array

}

function draw() {
  background('#222');

  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                         player.vel.x = 0;
  if (kb.pressing('w'))       player.vel.y = -4;
  else if (kb.pressing('s'))  player.vel.y = 4;
  else                         player.vel.y = 0;

  // STEP 4: for each collectible, detect a hit against the player, then
  //         collect it and add its value to the score

}
