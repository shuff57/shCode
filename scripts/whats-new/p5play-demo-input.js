let basket, star;
let score = 0;

function setup() {
  createCanvas(400, 300);
  basket = createSprite(200, 280, 80, 16);
  basket.shapeColor = color(255, 184, 108);
  star = createSprite(random(20, 380), 0, 18, 18);
  star.shapeColor = color(241, 250, 140);
  star.velocity.y = 3;
}

function draw() {
  background(40, 42, 54);
  basket.position.x = constrain(mouseX, 40, width - 40);
  if (star.overlap(basket)) {
    score++;
    star.position.y = 0;
    star.position.x = random(20, 380);
  }
  if (star.position.y > height) {
    star.position.y = 0;
    star.position.x = random(20, 380);
  }
  drawSprites();
  fill(255);
  textSize(18);
  text('Score: ' + score, 10, 24);
}
