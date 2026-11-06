// 5.2.4 Lab: A random spot and colour.

let coin;
let roll = 0;
const colors = ['gold', 'tomato', 'deepskyblue', 'limegreen', 'orchid'];

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0; // no falling: sprites stay where they are put (gravity is 5.2.8)

  coin = new Sprite(200, 150, 30, 30);
  coin.color = 'gold';
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('roll: ' + roll, 20, 28);

  // Once a second, everything changes. This beat is already written for you,
  // and each step below goes INSIDE it.
  if (frameCount % 60 === 0) {
    // STEP 1: move the coin to a random spot. Set coin.x to a random number
    //   between 30 and 370, and coin.y to a random number between 30 and 270.

    // STEP 2: roll a die. Set roll to a random WHOLE number from 1 to 6.

    // STEP 3: pick a random colour. Choose a random position in the colors
    //   list (a whole number, using the list's length so it keeps working if
    //   a colour is added), then set coin.color to the colour at that position.
  }
}
