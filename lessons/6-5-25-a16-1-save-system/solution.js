// 2.5.24 A16.1 Save System (reference solution).
// Three save slots + auto-save on goal + Continue from title screen.

let player, score = 0, level = 1;
let mode = 'play'; // 'title' | 'play'

function setup() {
  new Canvas(400, 400);
  player = new Sprite(60, 200, 24, 24);
  player.color = 'deepskyblue';
  // Show the title screen first if any save exists.
  if (getItem('autoSave')) mode = 'title';
}

function draw() {
  background('#222');

  if (mode === 'title') {
    fill('white');
    textSize(20);
    textAlign(CENTER);
    text('Save Demo', 200, 100);
    textSize(14);
    text('Press N for new game', 200, 160);
    if (getItem('autoSave')) text('Press C to continue', 200, 185);
    text('1 / 2 / 3 to load slot', 200, 215);
    if (kb.presses('n')) { newGame(); mode = 'play'; }
    if (kb.presses('c') && getItem('autoSave')) { loadSlot('autoSave'); mode = 'play'; }
    if (kb.presses('1')) { loadSlot('saveSlot1'); mode = 'play'; }
    if (kb.presses('2')) { loadSlot('saveSlot2'); mode = 'play'; }
    if (kb.presses('3')) { loadSlot('saveSlot3'); mode = 'play'; }
    return;
  }

  // Play state: WASD movement + score over time.
  if      (kb.pressing('a')) player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x =  3;
  else                       player.vel.x =  0;
  if      (kb.pressing('w')) player.vel.y = -3;
  else if (kb.pressing('s')) player.vel.y =  3;
  else                       player.vel.y =  0;

  if (frameCount % 60 === 0) score += 1;

  // Save to slot 1/2/3 when a digit is pressed with shift.
  if (kb.presses('!')) saveSlot('saveSlot1');
  if (kb.presses('@')) saveSlot('saveSlot2');
  if (kb.presses('#')) saveSlot('saveSlot3');

  // Auto-save on level-up (every 10 score).
  if (score >= level * 10) {
    level += 1;
    saveSlot('autoSave');
  }

  fill('white');
  textSize(14);
  text('score ' + score + '   level ' + level, 12, 24);
  text('shift+1/2/3 saves slot', 12, 380);
}

function buildSave() {
  return { x: player.x, y: player.y, score, level };
}

function saveSlot(key) {
  storeItem(key, JSON.stringify(buildSave()));
}

function loadSlot(key) {
  let raw = getItem(key);
  if (!raw) return;
  let s = JSON.parse(raw) || {};
  player.x = s.x ?? player.x;
  player.y = s.y ?? player.y;
  score = s.score ?? 0;
  level = s.level ?? 1;
}

function newGame() {
  player.x = 60; player.y = 200;
  score = 0; level = 1;
}
