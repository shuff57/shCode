// 6.14.8 Lab: The next level (reference solution: Coin Maze, final).

const TILE = 40;   // one tile is 40 by 40 pixels

const levels = [
  [
    '##########',
    '#P  c    #',
    '# ###### #',
    '#c      c#',
    '# # #### #',
    '#   #  c #',
    '### # ## #',
    '#c  #    #',
    '#  ## ##G#',
    '##########',
  ],
  [
    '##########',
    '#P   #  c#',
    '# ## # # #',
    '#c#  # # #',
    '# # ## # #',
    '# #    #c#',
    '# ###### #',
    '#   c#   #',
    '# ##   #G#',
    '##########',
  ],
  [
    '##########',
    '# #c     #',
    '# # ### ##',
    '#P  #c#  #',
    '### # ## #',
    '#c  #  # #',
    '# ###c ###',
    '#     #  #',
    '# ###   G#',
    '##########',
  ],
];

let walls, coins, goals, player, level, map;
let levelNum, score, won;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;   // seen from above: nothing falls

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'dimgray';

  coins = new Group();
  coins.collider = 'none';
  coins.diameter = 14;
  coins.color = 'gold';

  goals = new Group();
  goals.collider = 'none';
  goals.color = 'limegreen';

  player = new Sprite(0, 0, 26, 26);
  player.color = 'deepskyblue';
  player.rotationLock = true;

  startGame();
}

// A fresh game: back to the first level with nothing collected.
function startGame() {
  score = 0;
  won = false;
  levelNum = 0;
  loadLevel(levelNum);
}

// Throw the old level away, build level n from its rows of text, put the player on its P.
function loadLevel(n) {
  if (level) level.delete();
  map = levels[n];
  level = new Tiles(map, TILE / 2, TILE / 2, TILE, TILE, { '#': walls, 'c': coins, 'G': goals });
  const start = findStart(map);
  player.x = start.x;
  player.y = start.y;
}

function draw() {
  background('#111');
  if (kb.presses('r')) startGame();
  if (!won) {
    movePlayer();
    collect();
    checkGoal();
  } else {
    player.vel.x = 0;
    player.vel.y = 0;
  }
}

function movePlayer() {
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('left'))  player.vel.x = -3;
  if (kb.pressing('right')) player.vel.x = 3;
  if (kb.pressing('up'))    player.vel.y = -3;
  if (kb.pressing('down'))  player.vel.y = 3;
}

function findStart(map) {
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      if (map[r][c] === 'P') {
        return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
      }
    }
  }
  return { x: TILE / 2, y: TILE / 2 };   // no P in the map: use the top-left tile
}

function collect() {
  player.overlaps(coins, (p, coin) => {
    coin.delete();
    score += 1;
  });
}

// The goal only counts once every coin is gone. Then on to the next level, or the end.
function checkGoal() {
  if (coins.length === 0 && player.overlaps(goals)) {
    levelNum += 1;
    if (levelNum === levels.length) {
      won = true;
    } else {
      loadLevel(levelNum);
    }
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('coins left: ' + coins.length, 12, 24);
  text('level ' + Math.min(levelNum + 1, levels.length) + ' of ' + levels.length, 150, 24);
  text('score: ' + score, 300, 24);
  if (player.overlaps(goals) && coins.length > 0) {
    text('Grab every coin first!', 100, 392);
  }
  if (won) {
    textSize(32);
    text('You escaped!', 100, 200);
    textSize(16);
    text('Press R to play again', 120, 240);
  }
}
