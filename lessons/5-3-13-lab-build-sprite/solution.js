// 2.2.6 Your Turn — Build a Sprite (reference solution).

let rect, circ;

function setup() {
  new Canvas(400, 300);

  // Rectangle sprite (4-arg constructor).
  rect = new Sprite(120, 150, 80, 50);
  rect.color = 'deepskyblue';
  rect.stroke = 'white';
  rect.strokeWeight = 3;

  // Circle sprite (3-arg constructor).
  circ = new Sprite(280, 150, 60);
  circ.color = 'tomato';
}

function draw() {
  background('#222');
}
