// 2.6.24 A16.2 Game States (reference solution).
// switch(state) over title / play / pause / gameover, with save on transition
// and Continue restoring the saved state.

let state = 'title';
let player, score = 0;
const LOSE_AT = 25;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 24, 24);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  switch (state) {
    case 'title':
      fill('white');
      textSize(22);
      textAlign(CENTER);
      text('My Game', 200, 120);
      textSize(14);
      text('Press N for New Game', 200, 180);
      if (getItem('save')) text('Press C to Continue', 200, 205);
      if (kb.presses('n')) {
        score = 0;
        player.x = 200; player.y = 200;
        state = 'play';
        saveGame();
      }
      if (kb.presses('c') && getItem('save')) {
        loadGame();
      }
      break;

    case 'play':
      if      (kb.pressing('a')) player.vel.x = -3;
      else if (kb.pressing('d')) player.vel.x =  3;
      else                       player.vel.x =  0;
      if      (kb.pressing('w')) player.vel.y = -3;
      else if (kb.pressing('s')) player.vel.y =  3;
      else                       player.vel.y =  0;

      if (frameCount % 60 === 0) score += 1;

      if (kb.presses('p')) state = 'pause';

      if (score >= LOSE_AT) {
        state = 'gameover';
        saveGame();
      }

      fill('white');
      textSize(14);
      textAlign(LEFT);
      text('score ' + score + '   (P pauses)', 12, 24);
      break;

    case 'pause':
      player.vel.x = 0;
      player.vel.y = 0;
      fill('white');
      textSize(20);
      textAlign(CENTER);
      text('PAUSED: press P', 200, 200);
      if (kb.presses('p')) state = 'play';
      break;

    case 'gameover':
      player.vel.x = 0;
      player.vel.y = 0;
      fill('white');
      textSize(22);
      textAlign(CENTER);
      text('Game Over', 200, 160);
      textSize(14);
      text('Final score ' + score, 200, 195);
      text('Press R to restart', 200, 230);
      if (kb.presses('r')) {
        score = 0;
        player.x = 200; player.y = 200;
        state = 'title';
      }
      break;
  }
}

function saveGame() {
  storeItem('save', JSON.stringify({ state, score, x: player.x, y: player.y }));
}

function loadGame() {
  let raw = getItem('save');
  if (!raw) return;
  let s = JSON.parse(raw) || {};
  state = s.state || 'play';
  score = s.score || 0;
  player.x = s.x ?? 200;
  player.y = s.y ?? 200;
}
