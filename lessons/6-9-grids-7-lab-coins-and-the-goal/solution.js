// 6.9.7 Lab: Coins and the goal (reference solution).

const TILE = 40;   // one tile is 40 by 40 pixels

const map = [
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
];

let walls, coins, goals, player, level;
let score = 0;
let won = false;

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

  level = new Tiles(map, TILE / 2, TILE / 2, TILE, TILE, { '#': walls, 'c': coins, 'G': goals });

  player = new Sprite(0, 0, 26, 26);
  player.color = 'deepskyblue';
  player.rotationLock = true;
  const start = findStart(map);
  player.x = start.x;
  player.y = start.y;
}

function draw() {
  background('#111');
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

// Walking over a coin picks it up: the coin goes, the score goes up.
function collect() {
  player.overlaps(coins, (p, coin) => {
    coin.delete();
    score += 1;
  });
}

// The goal only counts once every coin is gone.
function checkGoal() {
  if (coins.length === 0 && player.overlaps(goals)) {
    won = true;
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('coins left: ' + coins.length, 12, 24);
  text('score: ' + score, 300, 24);
  if (player.overlaps(goals) && coins.length > 0) {
    text('Grab every coin first!', 100, 392);
  }
  if (won) {
    textSize(32);
    text('You escaped!', 100, 200);
  }
}
