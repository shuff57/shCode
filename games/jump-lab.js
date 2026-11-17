// Jump Lab: a test level for a sprite's jumping.
// Made by Steven Huff.
//
// You may remix this game and change anything you like.
// Keep the line above that says who made it, and add your
// own name under "Changed by" so the next person knows who
// did what.
//
// Changed by:
//
// Every jump call a sprite has is used here:
//
//   player.jump(platforms)
//     Jump, if one is left. Only the platforms group is
//     ground: landing on it gives the jumps back.
//   player.maxJumps
//     Jumps before landing again (2 = a double jump).
//   player.jumpPower
//     How hard a jump is (the default is 8).
//   player.jumpsLeft
//     How many are left. Set it to give jumps back.
//   player.onGround
//     True while the player stands on the platforms.
//
// Move: A / D or the arrow keys.
// Jump: space, W or up.
// 1 2 3 4: maxJumps   [ ]: jumpPower   R: start again
//
// Things to try:
//   - Double jump onto the middle ledge. The high ledge
//     needs 3 jumps from the floor.
//   - Land on the brown crate: it is solid but it is not a
//     platform, so no jumps come back.
//   - Walk off a ledge: the first jump is used up, so with
//     maxJumps 1 you can't jump in the air.
//   - Jump into the wall and keep pushing: touching its
//     side gives nothing back.
//   - Stand on the see-through ghost: it has collider
//     'none', so you fall through.
//   - Pick up the star (maxJumps 3), the boots (jumpPower
//     11) and the feather floating in mid-air
//     (jumpsLeft = maxJumps: every jump back).

let player, platforms, crate, ghost;
let star, boots, feather;
let lastJump = '-';

function setup() {
  new Canvas(640, 400);
  world.gravity.y = 30;

  platforms = new Group();
  platforms.collider = 'static';
  platforms.color = 'slategray';
  new platforms.Sprite(130, 392, 260, 16);   // floor, left of the pit
  new platforms.Sprite(490, 392, 300, 16);   // floor, right of the pit
  new platforms.Sprite(150, 290, 120, 14);   // low ledge
  new platforms.Sprite(300, 200, 120, 14);   // middle ledge
  new platforms.Sprite(470, 110, 110, 14);   // high ledge
  new platforms.Sprite(620, 265, 20, 240);   // the wall

  crate = new Sprite(225, 362, 44, 44, 'static');
  crate.color = 'sienna';

  ghost = new Sprite(520, 290, 100, 14);
  ghost.collider = 'none';
  ghost.color = 'rgba(180, 140, 255, 0.35)';

  star = new Sprite(470, 85, 18);
  star.color = 'gold';
  boots = new Sprite(540, 372, 18, 18);
  boots.color = 'limegreen';
  feather = new Sprite(400, 70, 14, 24);
  feather.color = 'white';
  for (const s of [star, boots, feather]) {
    s.collider = 'none';
  }

  player = new Sprite(60, 350, 24, 32);
  player.rotationLock = true;
  startAgain();
}

function startAgain() {
  player.x = 60;
  player.y = 350;
  player.vel.x = 0;
  player.vel.y = 0;
  player.maxJumps = 2;
  player.jumpPower = 8;
  star.visible = true;
  boots.visible = true;
  feather.visible = true;
  lastJump = '-';
}

function update() {
  if (kb.pressing('a') || kb.pressing('left')) {
    player.vel.x = -4;
  } else if (kb.pressing('d') || kb.pressing('right')) {
    player.vel.x = 4;
  } else {
    player.vel.x = 0;
  }

  if (kb.presses(' ') || kb.presses('w') || kb.presses('up')) {
    if (player.jump(platforms)) {
      lastJump = 'true (jumped)';
    } else {
      lastJump = 'false (none left)';
    }
  }

  if (kb.presses('1')) {
    player.maxJumps = 1;
  }
  if (kb.presses('2')) {
    player.maxJumps = 2;
  }
  if (kb.presses('3')) {
    player.maxJumps = 3;
  }
  if (kb.presses('4')) {
    player.maxJumps = 4;
  }
  if (kb.presses('[')) {
    player.jumpPower = max(2, player.jumpPower - 1);
  }
  if (kb.presses(']')) {
    player.jumpPower = min(16, player.jumpPower + 1);
  }
  if (kb.presses('r') || player.y > 460) {
    startAgain();
  }

  if (star.visible && player.overlaps(star)) {
    star.visible = false;
    player.maxJumps = 3;
  }
  if (boots.visible && player.overlaps(boots)) {
    boots.visible = false;
    player.jumpPower = 11;
  }
  if (feather.visible && player.overlaps(feather)) {
    feather.visible = false;
    player.jumpsLeft = player.maxJumps;
  }

  if (player.onGround) {
    player.color = 'deepskyblue';
  } else {
    player.color = 'orange';
  }
}

function draw() {
  background('#1e1f29');
  fill('#8393c4');
  textSize(12);
  text('pit', 288, 378);
  text('crate (not a platform)', 160, 330);
  text('ghost (collider none)', 452, 278);
  text('wall', 606, 138);
  text('3 jumps from the floor', 404, 134);
  if (star.visible) {
    text('star: maxJumps 3', 478, 70);
  }
  if (boots.visible) {
    text('boots: jumpPower 11', 470, 355);
  }
  if (feather.visible) {
    text('feather: every jump back', 338, 48);
  }
}

function drawTop() {
  fill('rgba(0, 0, 0, 0.55)');
  rect(8, 8, 250, 104);
  fill('white');
  textSize(13);
  let dots = '';
  for (let i = 0; i < player.maxJumps; i++) {
    if (i < player.jumpsLeft) {
      dots += '● ';
    } else {
      dots += '○ ';
    }
  }
  text('jumpsLeft: ' + player.jumpsLeft + '   ' + dots, 16, 26);
  text('maxJumps:  ' + player.maxJumps + '   (keys 1-4)', 16, 44);
  text('jumpPower: ' + player.jumpPower + '   ([ and ])', 16, 62);
  text('onGround:  ' + player.onGround, 16, 80);
  text('jump():    ' + lastJump, 16, 98);
}
