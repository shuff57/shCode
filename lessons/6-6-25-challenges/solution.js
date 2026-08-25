// 6.6.27 Challenges — Extended State Features (reference solution).
//
// The challenge this one takes: add a PAUSE state that remembers where it
// came from, so unpausing returns you to play rather than to the title. That
// is the whole reason `previousState` exists below -- a pause that always
// resumes to one hard-coded state is not really a state machine.

let state;
let previousState;
let score = 0;
let player;

function setup() {
  new Canvas(500, 400);
  state = 'title';

  player = new Sprite(250, 300, 30, 30);
  player.color = 'gold';
  player.collider = 'kinematic';
}

// One place that changes state, so every transition is greppable and there
// is exactly one line to put a log on when a transition misbehaves.
function goTo(next) {
  previousState = state;
  state = next;
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);

  switch (state) {
    case 'title':
      text('ARCADE — press enter to start', 120, 200);
      if (kb.presses('enter')) {
        score = 0;
        goTo('play');
      }
      break;

    case 'play':
      score = score + 1;
      if (kb.pressing('a')) player.x = player.x - 4;
      if (kb.pressing('d')) player.x = player.x + 4;
      text('score ' + score + '   (p pauses)', 20, 30);
      if (kb.presses('p')) goTo('paused');
      if (kb.presses('x')) goTo('gameover');
      break;

    case 'paused':
      text('PAUSED — p resumes, q quits to title', 100, 200);
      // Resume to whatever we paused FROM. Hard-coding 'play' here is the
      // bug this challenge exists to avoid.
      if (kb.presses('p')) goTo(previousState);
      if (kb.presses('q')) goTo('title');
      break;

    case 'gameover':
      text('GAME OVER — score ' + score, 150, 190);
      text('enter plays again', 170, 220);
      if (kb.presses('enter')) goTo('title');
      break;

    default:
      // An unknown state is a bug, not a screen. Say so loudly rather than
      // rendering nothing and looking like a freeze.
      text('unknown state: ' + state, 20, 200);
      break;
  }
}
