// 6.9.4 Lab: Build the maze (reference solution).

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
  goals = new Group();
  coins.collider = 'none';
  coins.diameter = 14;
  coins.color = 'gold';
  goals.collider = 'none';
  goals.color = 'limegreen';

  level = new Tiles(map, TILE / 2, TILE / 2, TILE, TILE, { '#': walls, 'c': coins, 'G': goals });

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
