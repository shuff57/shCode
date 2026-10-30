// 5.5.4 Lab: Share one number between two methods.

class Score {
  constructor() {
    this.points = 0;
  }

  // STEP 2: use the shared number here instead of this method's own copy.
  add() {
    let step = 3;
    this.points += step;
  }

  // STEP 3: use the shared number here too.
  undo() {
    this.points -= 3;
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
