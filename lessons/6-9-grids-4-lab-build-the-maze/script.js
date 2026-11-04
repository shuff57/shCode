// 6.14.4 Lab: Build the maze.

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
  // STEP 1: set two defaults on walls: its collider is 'static' (it never
  //   moves) and its color is 'dimgray'.

  coins = new Group();
  goals = new Group();
  // STEP 2: make coins (collider none, diameter 14, color gold) and goals
  //   (collider none, color limegreen), the same way.

  // STEP 3: build the level with new Tiles(map, 20, 20, TILE, TILE, legend).
  //   The legend is an object: the letter # builds walls, c builds coins, G
  //   builds goals.

  player = new Sprite(60, 60, 26, 26);
  player.color = 'deepskyblue';
  player.rotationLock = true;
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

function drawTop() {
  fill('white');
  textSize(16);
  text('coins left: ' + coins.length, 12, 24);
}
