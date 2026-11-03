// 6.9.6 Lab: Find the start.

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

  player = new Sprite(220, 60, 26, 26);   // a fixed spot for now; findStart decides where it really stands
  player.color = 'deepskyblue';
  player.rotationLock = true;
  // STEP 2: ask findStart(map) for the start and move the player there:
  //   player.x = start.x, and the same for y.
}

function draw() {
  background('#111');
  movePlayer();
}

function movePlayer() {
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('left'))  player.vel.x = -3;
  if (kb.pressing('right')) player.vel.x = 3;
  if (kb.pressing('up'))    player.vel.y = -3;
  if (kb.pressing('down'))  player.vel.y = 3;
}

// Scan the rows for the letter P and give back the pixel centre of that tile.
function findStart(map) {
  // STEP 1: write findStart(map). Loop over the rows and, inside, over the
  //   letters of each row. When map[r][c] is the letter P, return an object {
  //   x, y } with the pixel centre of that tile.
  return { x: TILE / 2, y: TILE / 2 };   // no P in the map: use the top-left tile
}

// The letter in the map at a pixel position: the way back, from pixels to a tile.
function tileAt(x, y) {
  // STEP 3: write tileAt(x, y). Turn the pixels into a column and a row with
  //   floor and TILE, and give back map[row][col].
}

function drawTop() {
  fill('white');
  textSize(16);
  text('coins left: ' + coins.length, 12, 24);
  text('standing on: [' + tileAt(player.x, player.y) + ']', 12, 48);
}
