// 5.8.4 Lab: Share one number between two methods (reference solution).

class Score {
  constructor() {
    this.points = 0;
    this.step = 3;
  }

  add() {
    this.points += this.step;
  }

  undo() {
    this.points -= this.step;
  }
}

let s;

function setup() {
  new Canvas(320, 200);
  s = new Score();
}

function draw() {
  background('#222');
  fill('white');
  textSize(24);
  text('points: ' + s.points, 20, 80);
  textSize(13);
  text('A adds a step   ·   U undoes one', 20, 130);
  text('both methods must use the SAME step', 20, 160);
  if (kb.presses('a')) s.add();
  if (kb.presses('u')) s.undo();
}
