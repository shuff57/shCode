// 5.2.4 Lab: A random spot and colour (reference solution).

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

  if (frameCount % 60 === 0) {
    coin.x = random(30, 370);
    coin.y = random(30, 270);

    roll = floor(random(1, 7));

    const pick = floor(random(colors.length));
    coin.color = colors[pick];
  }
}
