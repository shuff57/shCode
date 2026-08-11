// In-app shPlay reference — hand-authored against the real public/shplay/shplay.js API.
// Content is written fresh, not mechanically renamed from the old shPlay docs, because the
// actual engine surface differs (planck.js-backed, gaps closed per the audit gate).

// Scope-out (stated explicitly so a future maintainer doesn't rediscover the boundary):
// These shPlay API areas were dropped because no runnable lesson exercises them:
//   Visual / Visuals, EmojiImage, multitouch pointer/pointers, kb.shift/control/alt/meta,
//   world.renderStats / world.meterSize, palettes, world.timeScale / world.physicsTime /
//   world.realTime / world.autoStep / world.physicsUpdate, world.allowSleeping /
//   sprite.sleeping, world.explodeAt, world.rayCast / world.rayCastAll,
//   world.getSpritesAt, sprite.passes / pass, sprite.moveTowards / rotateTowards /
//   attractTo / angleTo / bearing, sprite.addCollider / addSensor / addDefaultSensors,
//   sprite.update / sprite.draw overrides, sprite.playAni / playAnis (Promise-based),
//   sprite.mass / density / drag / rotationDrag / applyTorque / rotationSpeed,
//   sprite.opacity / removed, sprite.grabbable, group.addTiles / tile, group.cull /
//   autoCull, group.life / autoDraw / autoUpdate, group.amount, subgroups (Group(parent)),
//   camera.zoom / camera.off / camera.on, mouse.drags / dragging / dragged,
//   mouse button-specific args, kb.released, contros (gamepad), pointer,
//   joint.springiness / damping / limitsEnabled / range / forceThreshold / torqueThreshold /
//   offsetA / offsetB, frameRate(), color(), rect/circle/line/triangle/noStroke/stroke
//   drawing primitives, textFont, parseTextureAtlas, loadImage, EmojiImage,
//   sprite.addAnis, anis.cutFrames / offset.
// If a future lesson needs one of these, that's a new gap to close then.

import {
  searchDocs as coreSearchDocs,
  getSection as coreGetSection,
  getAllSectionSlugs as coreGetAllSectionSlugs,
  type DocPage,
  type DocSection,
  type DocSearchResult,
} from './docs-core';

export type { DocPage, DocSection, DocSearchResult };

export const sections: DocSection[] = [
  {
    slug: 'overview',
    title: 'Overview',
    pages: [
      {
        title: 'What is shPlay?',
        body: `shPlay is a beginner-friendly 2D game engine for the web. It pairs a simple drawing canvas with real Box2D physics (via planck.js), so you can draw shapes and make them bump into each other without wiring the two worlds together yourself.

It's aimed at people who've written a little JavaScript and want to make a game this afternoon — not a week from now. The whole API is a handful of globals: Sprite, Group, world, camera, kb, mouse.

You don't import anything. You don't install anything. You write two functions — setup and draw — and the engine runs them for you. Add an update function if you need per-frame input or logic.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  player = new Sprite(200, 100, 40, 40);
  player.color = 'deepskyblue';
  new Sprite(200, 380, 400, 20, 'static');
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'The sketch lifecycle',
        body: `A shPlay sketch runs up to three functions on a loop. setup() runs once at the start — you make your canvas and your sprites there. update() runs every frame before physics steps — you read input and change velocities here. draw() runs every frame after physics — you clear the screen and draw any extras here.

update() runs before physics on purpose. When you set player.vel.x in update(), the next physics step uses that new velocity. If you set it in draw(), physics has already moved the sprite for this frame.

By default the loop targets 60 frames per second. frameCount tells you how many frames have passed since the sketch started — handy for timing things without a clock.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  player = new Sprite(200, 100, 30, 30);
  new Sprite(200, 380, 400, 20, 'static');
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('frame: ' + frameCount, 10, 20);
}`,
      },
      {
        title: 'Global mode',
        body: `shPlay runs in "global mode." That means Canvas, Sprite, world, kb, and friends are already on the page — you just use them. No import, no new Engine(), no setup boilerplate.

The same rule applies to setup, update, and draw. When you define a top-level function with one of those names, the engine finds it and calls it at the right time.

To share a sprite between setup and update, declare a let at the top of your file and assign to it inside setup. If you use const inside setup, the variable is trapped there and update can't see it.`,
        code: `let player;
let ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  player = new Sprite(200, 100, 30, 30);
  player.color = 'gold';
  ground = new Sprite(200, 380, 400, 20, 'static');
}

function update() {
  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -8;
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Debugging your sketch',
        body: `When something goes wrong, open your browser's developer console (F12 on most systems). Errors show up there with a line number. console.log(value) is your best friend — sprinkle it anywhere to see what's happening.

Three mistakes trip up almost every beginner. First: forgetting background() in draw. The canvas never clears, so old frames pile up and everything looks smeared. Second: creating new Sprite() inside draw or update instead of setup. You'll spawn a new sprite every frame and the sketch will grind to a halt. Third: using a variable before it's assigned — usually because you wrote let player inside setup instead of at the top of the file.

If a sprite isn't showing up, log its x and y. If input doesn't work, log kb.pressing('left') inside update to confirm the key name.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 30, 30);
  console.log('setup ran, player at', player.x, player.y);
}

function update() {
  if (kb.presses(' ')) {
    console.log('space pressed on frame', frameCount);
  }
}

function draw() {
  background('#222');
}`,
      },
    ],
  },
  {
    slug: 'canvas',
    title: 'Canvas',
    pages: [
      {
        title: 'Creating the canvas',
        body: `new Canvas(width, height) inside setup() makes the drawing surface for your sketch. Without it, nothing shows up. Call it first, before you make any sprites, so the engine knows how big the world is.

The canvas coordinates start at (0, 0) in the top-left. X grows to the right, y grows downward. A 400 by 400 canvas has its center at (200, 200).

The default background is transparent — you'll usually replace it by calling background() inside draw.`,
        code: `function setup() {
  new Canvas(400, 400);
}

function draw() {
  background('#202030');
}`,
      },
      {
        title: 'frameCount',
        body: `frameCount is a global number that starts at 0 and goes up by 1 every frame. It's the simplest way to animate: use it to offset a position, wrap a counter with %, or trigger something every N frames.

Combine frameCount with Math.sin or Math.cos to get smooth back-and-forth motion without any physics.`,
        code: `let ball;

function setup() {
  new Canvas(400, 400);
  ball = new Sprite(200, 200, 40);
  ball.collider = 'none';
  ball.color = 'gold';
}

function update() {
  ball.x = 200 + Math.sin(frameCount / 30) * 120;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('frame ' + frameCount, 10, 20);
}`,
      },
      {
        title: 'Background and clearing',
        body: `background(color) paints over the whole canvas. Call it first thing in draw() so last frame's pixels are erased before new ones go down. Skip it and you'll see comet-like trails behind every moving sprite.

A solid color takes a name ('black', 'tomato'), a hex string ('#222', '#ff00aa'), or an rgba string. For a see-through background use 'rgba(0, 0, 0, 0.1)' — only 10% opaque, so old frames fade out gradually instead of vanishing.

That fade trick is how you get motion trails without tracking history yourself. The lower the alpha, the longer the trail.`,
        code: `let p;

function setup() {
  new Canvas(400, 400);
  p = new Sprite(200, 200, 20);
  p.collider = 'none';
  p.color = 'gold';
}

function update() {
  p.x = 200 + Math.cos(frameCount / 20) * 150;
  p.y = 200 + Math.sin(frameCount / 20) * 150;
}

function draw() {
  background('rgba(0, 0, 0, 0.1)');
}`,
      },
    ],
  },
  {
    slug: 'sprite',
    title: 'Sprite',
    pages: [
      {
        title: 'Your first sprite',
        body: `A Sprite is the basic building block of any shPlay game. Every sprite has a position, a size, and (usually) a physics body that moves and collides automatically.

new Sprite(x, y, width, height) creates a rectangular sprite centered on (x, y). With no extra argument it's dynamic, meaning gravity pulls it and it bumps into other sprites.

Store the sprite in a variable declared outside setup() so update() and draw() can reach it later. Without a reference, you can't move it or check its state.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 180, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Collider types: dynamic, static, kinematic, none',
        body: `Every sprite has a physics type. You set it by passing a string as the last argument to new Sprite, or later with sprite.collider = '...'.

'dynamic' is the default — gravity pulls it, other sprites push it. Use it for players, enemies, projectiles.

'static' never moves and never reacts. Use it for floors, walls, and platforms. 'kinematic' moves only when you set its velocity — gravity ignores it. Use it for moving platforms and doors. 'none' turns physics off entirely — the sprite still draws, but nothing collides with it. Use it for cursors, UI, and decorations. A sprite with collider = 'none' is a sensor: you can still detect overlaps, but there's no physical pushback.`,
        code: `let elevator;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  new Sprite(200, 100, 40, 40);                    // dynamic (default)
  new Sprite(200, 380, 400, 20, 'static');         // static floor
  new Sprite(100, 260, 80, 10, 'static');          // static platform

  elevator = new Sprite(320, 260, 60, 10, 'kinematic');
  elevator.vel.y = -1;

  const hint = new Sprite(200, 30, 10, 10);
  hint.collider = 'none';
  hint.color = 'gold';
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Position, rotation, scale',
        body: `.x and .y are the center of the sprite, not the top-left corner. A sprite at (200, 200) has its middle at (200, 200).

.rotation is in degrees. 90 is a quarter turn, 180 is a half turn, 360 is a full turn.

.scale uniformly grows or shrinks how the sprite is drawn. The physics body stays the size you created it at, so very large scale values can look strange when the sprite collides.`,
        code: `let box, spinner;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  box = new Sprite(120, 200, 40, 60);
  box.rotation = 30;

  spinner = new Sprite(280, 200, 40, 40);
  spinner.collider = 'none';
  spinner.color = 'gold';
}

function update() {
  spinner.rotation += 3;
  spinner.scale.x = 1 + 0.3 * Math.sin(frameCount / 20);
  spinner.scale.y = spinner.scale.x;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Color, visibility, and layer',
        body: `.color sets the fill. You can use CSS names ('red'), hex ('#ff8800'), or rgb strings.

.stroke is the outline color and .strokeWeight is its thickness in pixels. Set strokeWeight to 0 for no outline.

.visible = false hides a sprite without removing it — physics still runs. .layer controls draw order — higher layer values draw on top.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  const back = new Sprite(180, 200, 120, 120);
  back.color = '#4455aa';
  back.layer = 0;

  const front = new Sprite(220, 200, 120, 120);
  front.color = 'gold';
  front.stroke = 'black';
  front.strokeWeight = 3;
  front.layer = 1;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Shape options',
        body: `shPlay picks the collider shape from the constructor arguments. Two numbers make a 50×50 square: new Sprite(x, y). Three numbers make a circle: new Sprite(x, y, diameter). Four numbers make a rectangle: new Sprite(x, y, w, h).

You can also pass a body type as the last argument: new Sprite(x, y, w, h, 'static').

The engine chooses the collider shape from these arguments — you don't set a .shape property directly (though you can read it to check whether a sprite is 'circle' or 'rect').`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  new Sprite(90, 120, 40, 60);

  const ball = new Sprite(200, 120, 40);
  ball.color = 'tomato';

  new Sprite(200, 380, 400, 20, 'static');
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Removing and cleaning up sprites',
        body: `sprite.delete() removes a sprite from the world. After deleting, it stops drawing, stops updating, and its physics body is gone. It also removes itself from every group it belongs to, including the implicit allSprites group. There is no undo — if you only want to hide a sprite, set .visible = false instead.

group.remove(sprite) only unparents the sprite from that group — the sprite keeps existing, drawing, and running physics. These are NOT the same operation.

When you delete sprites while looping through a Group, iterate a copy with [...group]. Otherwise the array shrinks under your feet and you'll skip items.`,
        code: `let bullets;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  bullets = new Group();
  bullets.color = 'gold';
  bullets.diameter = 10;
  bullets.collider = 'none';
}

function update() {
  if (frameCount % 10 === 0) {
    const b = new bullets.Sprite(20, 200);
    b.vel.x = 4;
  }
  for (const b of [...bullets]) {
    if (b.x > 400) b.delete();
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('Live bullets: ' + bullets.length, 14, 24);
}`,
      },
      {
        title: 'Angular velocity',
        body: `sprite.angularVelocity is the rotation speed in degrees per frame. Positive spins clockwise, negative spins counter-clockwise.

You can read it to see how fast a sprite is spinning, or write it to give a sprite a spin kick — like a pendulum that gets pushed on a mouse click. The value is in degrees per frame, matching the facade's pixel-per-frame convention for linear velocity.`,
        code: `let rod, anchor;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  anchor = new Sprite(200, 80, 12, 12, 'static');
  rod = new Sprite(200, 180, 12, 160);
  rod.color = 'khaki';

  new HingeJoint(anchor, rod);
}

function update() {
  if (mouse.presses()) {
    rod.angularVelocity = 6;
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Images and emoji on sprites',
        body: `sprite.image = 'player.png' loads an image from a URL and draws it in place of the default colored shape. The image stretches to fill the sprite's width and height.

If the string has no dot in it, shPlay treats it as an emoji: sprite.image = '🧍' draws that emoji character centered on the sprite at the sprite's height as the font size. This is a quick way to get a visible character without loading assets.

Setting .image clears any active animation (sprite.ani), and vice versa — they're mutually exclusive.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  player = new Sprite(200, 200, 64, 64);
  player.collider = 'none';
  player.image = '\u{1F984}';
}

function update() {
  if (kb.pressing('left'))       player.x -= 3;
  else if (kb.pressing('right')) player.x += 3;
}

function draw() {
  background('#222');
}`,
      },
    ],
  },
  {
    slug: 'physics',
    title: 'Physics',
    pages: [
      {
        title: 'Gravity and velocity',
        body: `world.gravity.y pulls every dynamic sprite downward. 10 feels roughly earth-like; set it to 0 for top-down games, or try negative values for "upside-down" worlds.

Each sprite has a .vel vector with .x and .y components, measured in pixels per frame. At 60 fps, vel.x = 4 means the sprite moves 240 pixels per second. Reading .vel tells you how fast a sprite is moving; writing it overrides physics for that frame.

Assigning vel every frame is fine for player controls — you're telling the engine exactly what you want.`,
        code: `let player, ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  player = new Sprite(200, 100, 40, 40);
  player.color = 'deepskyblue';
  ground = new Sprite(200, 380, 400, 20, 'static');
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -5;
  else if (kb.pressing('right')) player.vel.x = 5;
  else                           player.vel.x = 0;

  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -8;
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Bounciness and friction',
        body: `.bounciness (also called restitution) is how much speed a sprite keeps after a collision. 0 means it sticks, 1 means it bounces back at full speed, values above 1 add energy (fun, but unstable).

.friction resists sliding along a surface. 0 is ice — sprites slide forever. Higher values drag motion to a stop quickly.

These are per-sprite properties. When two sprites touch, Box2D combines their values — bounciness uses the higher of the two, friction uses a geometric mean.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  const floor = new Sprite(200, 380, 400, 20, 'static');
  floor.friction = 0.3;

  const bouncy = new Sprite(120, 80, 30);
  bouncy.bounciness = 0.9;
  bouncy.color = 'tomato';

  const dead = new Sprite(200, 80, 30);
  dead.bounciness = 0;
  dead.color = 'slategray';

  const slippery = new Sprite(280, 80, 30);
  slippery.friction = 0;
  slippery.bounciness = 0.4;
  slippery.color = 'deepskyblue';
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Applying forces',
        body: `sprite.applyForce(fx, fy) pushes a sprite with a force in pixels per frame squared. Pass the x and y components as two separate numbers. Call it every frame for continuous thrust, or once for a shove.

Forces respect mass — heavier sprites react less to the same push than light ones do. This is different from setting .vel directly, which overrides physics entirely.

applyForce is good for rockets, wind, magnets, or any continuous push where you want the physics engine to handle the acceleration naturally.`,
        code: `let rocket;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');

  rocket = new Sprite(200, 300, 20, 60);
  rocket.color = 'tomato';
}

function update() {
  if (kb.pressing('up'))    rocket.applyForce(0, -40);
  if (kb.pressing('left'))  rocket.applyForce(-20, 0);
  if (kb.pressing('right')) rocket.applyForce(20, 0);

  if (kb.presses(' ')) rocket.applyForce(0, -200);
}

function draw() {
  background('#222');
}`,
      },
    ],
  },
  {
    slug: 'collisions',
    title: 'Collisions & Overlaps',
    pages: [
      {
        title: 'colliding vs overlapping',
        body: `There are two ways sprites can interact. Colliding is physical contact — the sprites push each other and bounce. Overlapping is just bounding-box intersection — the sprites pass through each other but you can still detect the touch.

Dynamic and static sprites collide by default. To let one sprite pass through another without stopping, set its .collider to 'none' — the sprite still draws and you can still test for overlap, but there's no physical pushback.

Use colliding for ground checks, walls, and enemies that block the player. Use overlapping for coins, goal zones, power-ups, and other triggers that shouldn't shove the player.`,
        code: `let player, wall, zone;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  player = new Sprite(80, 200, 30, 30);
  player.color = 'deepskyblue';

  wall = new Sprite(220, 200, 20, 200, 'static');
  wall.color = 'slategray';

  zone = new Sprite(340, 200, 60, 60);
  zone.collider = 'none';
  zone.color = 'gold';
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else                           player.vel.x = 0;

  if (player.overlapping(zone)) zone.color = 'lime';
  else                          zone.color = 'gold';
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Overlap callbacks',
        body: `sprite.overlaps(other) returns true if the two sprites' bounding boxes intersect. Pass a Group and it returns true if any member overlaps.

You can also pass a callback as the second argument: sprite.overlaps(group, (self, other) => { ... }). The callback fires once per overlapping pair, after the method has finished its own iteration — so it's safe to delete() sprites inside the callback.

This is the cleanest way to collect pickups: player.overlaps(coins, (p, coin) => { score++; coin.delete(); }).`,
        code: `let player, coins;
let score = 0;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 30, 30);
  player.color = 'deepskyblue';

  coins = new Group();
  coins.diameter = 18;
  coins.color = 'gold';
  coins.collider = 'none';
  new coins.Sprite(120, 120);
  new coins.Sprite(300, 260);
  new coins.Sprite(260, 320);
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else                           player.vel.x = 0;
  if (kb.pressing('up'))         player.vel.y = -4;
  else if (kb.pressing('down'))  player.vel.y = 4;
  else                           player.vel.y = 0;

  player.overlaps(coins, (p, coin) => {
    score++;
    coin.delete();
  });
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('Score: ' + score, 10, 24);
}`,
      },
      {
        title: 'Collisions with groups',
        body: `The collision functions work against a single sprite or a whole Group. player.colliding(enemies) returns a truthy number (a running frame count) while the player touches any sprite in the enemies group.

colliding() reads real physics contacts from Box2D — it's not the same as the manual bounding-box math that overlaps() uses. Use colliding(ground) before a jump to confirm the player is standing on something solid.

If you need to know which sprite was hit, iterate the group yourself and test one-by-one. When you delete sprites in response to a hit, loop over [...group] (a copy) so the shrinking group doesn't skip items.`,
        code: `let player, enemies;
let hp = 3;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  player = new Sprite(60, 200, 30, 30);
  player.color = 'deepskyblue';

  enemies = new Group();
  enemies.diameter = 24;
  enemies.color = 'tomato';
  enemies.collider = 'none';
  new enemies.Sprite(220, 140);
  new enemies.Sprite(260, 220);
  new enemies.Sprite(320, 300);
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -3;
  else if (kb.pressing('right')) player.vel.x = 3;
  if (kb.pressing('up'))         player.vel.y = -3;
  else if (kb.pressing('down'))  player.vel.y = 3;

  for (const e of [...enemies]) {
    if (player.overlapping(e)) {
      hp--;
      e.delete();
    }
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('HP: ' + hp, 14, 24);
}`,
      },
    ],
  },
  {
    slug: 'groups',
    title: 'Groups',
    pages: [
      {
        title: 'Spawning and defaults',
        body: `A Group holds many sprites that share traits. Set a property on the group and every sprite spawned into it inherits that value as its default.

Create a group with new Group(). Then spawn sprites into it with new groupName.Sprite(...) — note the capital S. That factory reads the group's color, diameter, collider, and other defaults, copies them onto the new sprite, and adds the sprite to the group.

Common defaults to set right after creating a group: color, diameter (for circles) or w/h, collider ('none' is useful for pickups and decorations), and layer.`,
        code: `let stars;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  stars = new Group();
  stars.color = 'gold';
  stars.diameter = 16;
  stars.collider = 'none';

  new stars.Sprite(100, 100);
  new stars.Sprite(200, 200);
  new stars.Sprite(300, 300);
}

function draw() {
  background('#112');
}`,
      },
      {
        title: 'Iterating and removing',
        body: `A Group extends Array. You get .length, indexing with group[i], for..of loops, and array methods like .forEach directly on the group.

One trap: removing sprites while iterating shifts the array and skips items. Iterate over a copy when you might remove entries: for (const s of [...group]). The spread makes a snapshot so the original can shrink safely.

group.remove(sprite) pulls the sprite out of the group but leaves it in the world — it still draws and runs physics. sprite.delete() destroys the sprite entirely and unparents it from every group. These are different operations with different effects.`,
        code: `let drops;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  drops = new Group();
  drops.color = 'deepskyblue';
  drops.diameter = 14;
  drops.collider = 'none';
}

function update() {
  if (frameCount % 10 === 0) {
    new drops.Sprite(Math.random() * 400, 0);
  }
  for (const d of [...drops]) {
    d.y += 3;
    if (d.y > 420) d.delete();
  }
}

function draw() {
  background('#112');
  fill('white');
  textSize(14);
  text('drops: ' + drops.length, 14, 22);
}`,
      },
      {
        title: 'The allSprites group',
        body: `allSprites is a built-in Group that every sprite joins automatically the moment it's created. You never construct it — it's already there as soon as shPlay loads.

It's useful whenever you want to touch "every sprite in the scene" at once: allSprites.length for a live count, or for (const s of allSprites) to iterate the whole world.

Since it extends Array like any other Group, the same patterns apply.`,
        code: `let player, rocks;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 20);
  player.color = 'white';

  rocks = new Group();
  rocks.color = 'slategray';
  rocks.diameter = 18;
  rocks.collider = 'none';
  for (let i = 0; i < 5; i++) {
    new rocks.Sprite(60 + i * 60, 320);
  }
}

function draw() {
  background('#112');
  fill('white');
  textSize(14);
  text('allSprites: ' + allSprites.length, 14, 22);
}`,
      },
      {
        title: 'Custom properties',
        body: `You aren't limited to shPlay's built-in properties. Assign any property you like on a group and it becomes a default for every sprite spawned afterward — enemies.hp = 3 gives every new enemy an hp of 3.

Each sprite gets its own copy of the value on spawn, so changing one enemy's hp doesn't affect the others. The group just holds the template.

This is how you keep gameplay data attached to the right sprite. Tag sprites with custom fields like .hp, .score, .kind, or anything else your game needs, and read them back off the individual sprite during collisions.`,
        code: `let player, enemies;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 20);
  player.color = 'white';

  enemies = new Group();
  enemies.color = 'tomato';
  enemies.diameter = 20;
  enemies.hp = 3;

  for (let i = 0; i < 4; i++) {
    new enemies.Sprite(80 + i * 70, 80);
  }
}

function update() {
  if (player.overlaps(enemies)) {
    for (const e of enemies) {
      if (player.overlaps(e)) { e.hp -= 1; if (e.hp <= 0) e.delete(); }
    }
  }
}

function draw() {
  background('#112');
}`,
      },
    ],
  },
  {
    slug: 'camera',
    title: 'Camera',
    pages: [
      {
        title: 'Following a target',
        body: `The camera controls which part of the world is visible. camera.x and camera.y are the viewport's center in world coordinates.

The simplest follow is to snap the camera to the player each frame: camera.x = player.x. It works, but the view jitters on every tiny movement.

A soft follow eases the camera toward the player with a catch-up factor: camera.x += (player.x - camera.x) * 0.1. Smaller factors feel floaty; larger factors feel snappy. 0.1 is a good starting point.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(1000, 390, 2000, 20, 'static');
  for (let x = 200; x < 2000; x += 300) {
    new Sprite(x, 300, 60, 10, 'static');
  }
  player = new Sprite(200, 300, 30, 30);
  player.color = 'deepskyblue';
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -5;
  else if (kb.pressing('right')) player.vel.x = 5;
  if (kb.presses(' ')) player.vel.y = -8;

  camera.x += (player.x - camera.x) * 0.1;
  camera.y += (player.y - camera.y) * 0.1;
}

function draw() {
  background('#222');
}`,
      },
    ],
  },
  {
    slug: 'input',
    title: 'Input',
    pages: [
      {
        title: 'Keyboard basics',
        body: `The global kb object reports keyboard state every frame.

kb.pressing('key') returns true while the key is held down. Use it for continuous actions like walking.

kb.presses('key') is true only on the first frame of a press (edge-triggered). Use it for single-shot actions like jumping or firing.

Key names are lowercase strings: 'left', 'right', 'up', 'down', 'a', 'w', 'enter', and ' ' (a single space) for the space bar. Arrow keys and space bar are automatically prevented from scrolling the page.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else                           player.vel.x = 0;

  if (kb.presses(' '))   player.color = 'gold';
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Mouse position and buttons',
        body: `mouse.x and mouse.y are the cursor's position in world coordinates (already camera-aware).

mouse.pressing() returns true while the primary mouse button is held. mouse.presses() is true only on the first frame of a click — use it for single-shot actions. mouse.released() is true on the frame the button is released.

Combine mouse position with world.getSpriteAt(x, y) to build click-to-select or drag interactions.`,
        code: `let dot;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  dot = new Sprite(200, 200, 24);
  dot.color = 'white';
  dot.collider = 'none';
}

function update() {
  dot.x = mouse.x;
  dot.y = mouse.y;

  if (mouse.pressing())       dot.color = 'gold';
  else                        dot.color = 'white';
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('x: ' + Math.round(mouse.x) + '  y: ' + Math.round(mouse.y), 14, 22);
}`,
      },
      {
        title: 'Hit-testing with the mouse',
        body: `world.getSpriteAt(x, y) returns the top-most (highest layer) sprite at that world position, or undefined if nothing is there. It checks both circles (radius test) and rectangles (bounding box).

This is the pattern for click-to-select: on mouse.presses(), call world.getSpriteAt(mouse.x, mouse.y) and remember the result. Then you can drag it, change its color, or delete it.`,
        code: `let selected;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  for (let i = 0; i < 6; i++) {
    let s = new Sprite(60 + i * 55, 200, 40, 40);
    s.color = 'steelblue';
  }
}

function update() {
  if (mouse.presses()) {
    if (selected) selected.color = 'steelblue';
    selected = world.getSpriteAt(mouse.x, mouse.y);
    if (selected) selected.color = 'tomato';
  }
}

function draw() {
  background('#222');
}`,
      },
    ],
  },
  {
    slug: 'joints',
    title: 'Joints',
    pages: [
      {
        title: 'GlueJoint',
        body: `A GlueJoint welds two sprites together so they move and rotate as a single rigid body. Create it with new GlueJoint(spriteA, spriteB) — just the two sprites, no options object.

Once glued, changing one sprite's position or velocity carries the other along. Gluing a dynamic sprite to a static one effectively pins it in place.

Like every joint, call joint.delete() to break the connection and let the sprites move independently again.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');

  const stem = new Sprite(200, 200, 20, 100);
  const cap = new Sprite(200, 150, 100, 20);
  new GlueJoint(stem, cap);
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'DistanceJoint',
        body: `A DistanceJoint keeps two sprites at a fixed distance — the basis for ropes, tethers, and pendulum strings. Create it with new DistanceJoint(spriteA, spriteB, options).

Set joint.length after construction to change the target distance. The length is in pixels. You can also pass { length: 100 } in the options object at construction time.

Call joint.delete() to remove the constraint.`,
        code: `let tether;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  const anchor = new Sprite(200, 60, 16, 16, 'static');
  const ball = new Sprite(320, 60, 30);
  ball.color = 'tomato';

  tether = new DistanceJoint(anchor, ball);
  tether.length = 120;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'HingeJoint',
        body: `A HingeJoint pins two sprites at a shared point and lets them rotate around it. Use it for pendulums, swinging doors, and anything that needs to pivot.

Create it with new HingeJoint(spriteA, spriteB, options). Pass { anchor: { x, y } } in the options to set the pivot point in world coordinates — otherwise it defaults to spriteA's position.

Call joint.delete() to remove the hinge.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  const anchor = new Sprite(200, 80, 16, 16, 'static');
  const rod = new Sprite(200, 180, 16, 180);
  rod.color = 'khaki';

  new HingeJoint(anchor, rod);
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'SliderJoint',
        body: `A SliderJoint locks two sprites to a single axis of motion and forbids rotation between them. It's perfect for pistons, elevators, and sliding panels.

Create it with new SliderJoint(spriteA, spriteB, options). Pass { axis: { x, y } } to set the slide direction — { x: 0, y: 1 } for vertical, { x: 1, y: 0 } for horizontal. Drive the moving sprite with .vel along the axis.

Call joint.delete() to remove the constraint.`,
        code: `let base, piston;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  base = new Sprite(200, 200, 20, 20, 'static');
  piston = new Sprite(200, 260, 80, 20);
  piston.color = 'orange';

  new SliderJoint(base, piston, { axis: { x: 0, y: 1 } });
}

function update() {
  if (kb.pressing('up'))        piston.vel.y = -3;
  else if (kb.pressing('down')) piston.vel.y = 3;
  else                          piston.vel.y = 0;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'WheelJoint',
        body: `WheelJoint is built for vehicles. Pass the chassis as spriteA and the wheel as spriteB. The wheel can travel along an axis (giving you suspension) and spin freely.

Create it with new WheelJoint(chassis, wheel, options). Pass { axis: { x, y } } to set the suspension axis — { x: 0, y: 1 } for vertical suspension.

Drive the wheel by setting its angularVelocity each frame. Call joint.delete() to remove the constraint.`,
        code: `let chassis, wheel;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');

  chassis = new Sprite(200, 300, 100, 20);
  wheel = new Sprite(180, 330, 26);
  wheel.friction = 1;
  new WheelJoint(chassis, wheel, { axis: { x: 0, y: 1 } });
}

function update() {
  if (kb.pressing('right'))     wheel.angularVelocity = 6;
  else if (kb.pressing('left')) wheel.angularVelocity = -6;
  else                          wheel.angularVelocity = 0;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'GrabberJoint',
        body: `A GrabberJoint lets you pull a physics sprite toward a target position with a spring force. It's how you drag boxes around in a physics puzzle.

Create it with new GrabberJoint(anchorSprite, draggedSprite, options). The anchor is usually a static sprite at a fixed position. Pass { maxForce: 200 } to control how strong the pull is — higher values feel snappier.

Call joint.delete() to release the sprite.`,
        code: `let box, anchor, grab;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');

  anchor = new Sprite(200, 200, 10, 10, 'static');
  anchor.visible = false;

  box = new Sprite(200, 300, 50, 50);
  box.color = 'deepskyblue';
}

function update() {
  if (mouse.presses() && world.getSpriteAt(mouse.x, mouse.y) === box) {
    anchor.x = mouse.x;
    anchor.y = mouse.y;
    grab = new GrabberJoint(anchor, box, { maxForce: 200 });
  }
  if (grab && mouse.pressing()) {
    anchor.x = mouse.x;
    anchor.y = mouse.y;
  }
  if (mouse.released() && grab) {
    grab.delete();
    grab = null;
  }
}

function draw() {
  background('#222');
}`,
      },
    ],
  },
  {
    slug: 'animation',
    title: 'Animation',
    pages: [
      {
        title: 'Procedural animation',
        body: `Not every animation needs a sprite sheet. The global frameCount increments every frame — combining it with Math.sin, Math.cos, and the modulo operator is enough for bobbing, spinning, pulsing, and color cycling.

Math.sin(frameCount / period) oscillates between -1 and 1. Multiply by an amplitude and add a baseline to shift it into the range you want.

Modulo (frameCount % n) cycles through integers 0..n-1 each n frames — great for flashing effects or phase changes.`,
        code: `let orb;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  orb = new Sprite(200, 200, 50);
  orb.collider = 'none';
}

function update() {
  orb.x = 200 + 120 * Math.cos(frameCount / 40);
  orb.y = 200 + 60 * Math.sin(frameCount / 20);
  orb.rotation = frameCount * 3;
  orb.scale.x = 1 + 0.25 * Math.sin(frameCount / 15);
  orb.scale.y = orb.scale.x;
  orb.color = (frameCount % 60 < 30) ? 'cyan' : 'magenta';
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'addAni and changeAni',
        body: `shPlay supports minimal sprite-sheet animation. sprite.addAni(name, sheetUrl, frameCount) loads a horizontal frame strip from an image URL and registers it under the given name. The first addAni call auto-activates that animation.

sprite.changeAni(name) switches to a previously registered animation. If the name isn't found, it's a silent no-op — nothing happens.

ani.frameDelay controls how many game frames each animation frame is held for (default 4). Set it on the Ani object returned by addAni, or on sprite.ani.frameDelay after activation.

Setting sprite.image clears any active animation, and vice versa — they're mutually exclusive.`,
        code: `let hero;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  hero = new Sprite(200, 200, 64, 64);
  hero.collider = 'none';

  // In a real project you'd use a URL to your own sprite sheet:
  // hero.addAni('idle', 'hero-idle.png', 4);
  // hero.addAni('run', 'hero-run.png', 6);

  // For this sandbox, use an emoji as a stand-in:
  hero.image = '\u{1F9D9}';
}

function update() {
  if (kb.pressing('right')) {
    hero.x += 2;
    // hero.changeAni('run');
  } else {
    // hero.changeAni('idle');
  }
}

function draw() {
  background('#222');
}`,
      },
    ],
  },
  {
    slug: 'text',
    title: 'Text & HUD',
    pages: [
      {
        title: 'Displaying text',
        body: `text(string, x, y) draws text on the canvas at (x, y). Call it from draw() so it gets re-drawn every frame — otherwise background() will erase it.

textSize(px) sets the font size in pixels. fill(color) sets the text color (yes, the same fill you use for shapes). textAlign('left' | 'center' | 'right') changes how x positions the string — 'left' puts x at the left edge, 'center' puts x at the middle.

You can also pass size and color directly to text(): text('hello', 10, 20, 18, 'gold'). The constants CENTER, LEFT, and RIGHT are available for textAlign.

You can build strings with + just like normal JavaScript: 'Score: ' + score.`,
        code: `let score = 0;

function setup() {
  new Canvas(400, 400);
}

function update() {
  if (kb.presses(' ')) score++;
}

function draw() {
  background('#112');

  fill('white');
  textSize(28);
  textAlign(CENTER);
  text('shPlay', 200, 80);

  fill('gold');
  textSize(18);
  textAlign(LEFT);
  text('Score: ' + score, 20, 140);

  fill('#888');
  textSize(12);
  text('press space to score', 20, 160);
}`,
      },
      {
        title: "HUDs that don't scroll",
        body: `When you move camera.x to follow the player, everything drawn inside draw() scrolls with the world — including your score text. That's rarely what you want for a HUD.

The simplest approach: draw your HUD at fixed screen coordinates before moving the camera. Since the camera starts at (0, 0) each frame, draw your HUD first, then update the camera position for the rest of the frame.

For a more robust approach, track the camera offset and subtract it when drawing HUD elements. But for most simple games, drawing the HUD at the top of draw() before any camera movement works fine.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(1000, 390, 2000, 20, 'static');
  player = new Sprite(200, 300, 30, 30);
  player.color = 'deepskyblue';
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -5;
  else if (kb.pressing('right')) player.vel.x = 5;
  camera.x += (player.x - camera.x) * 0.1;
}

function draw() {
  background('#222');

  fill('white');
  textSize(16);
  text('x: ' + Math.round(player.x), 10, 24);
}`,
      },
    ],
  },
  {
    slug: 'persistence',
    title: 'Persistence',
    pages: [
      {
        title: 'Saving and loading data',
        body: `shPlay provides three functions for storing data in the browser's localStorage.

storeItem(name, value) saves a value under a key. The value is automatically JSON-stringified, so you can store numbers, strings, arrays, and objects.

getItem(name) retrieves a previously stored value, parsing it back from JSON. Returns null if the key doesn't exist.

removeItem(name) deletes a stored value.

This is how you save high scores, level progress, or player preferences between sessions. Data persists even after the browser is closed.`,
        code: `let highScore = 0;
let score = 0;

function setup() {
  new Canvas(400, 400);
  highScore = getItem('highScore') || 0;
}

function update() {
  if (kb.presses(' ')) {
    score++;
    if (score > highScore) {
      highScore = score;
      storeItem('highScore', highScore);
    }
  }
  if (kb.presses('r')) {
    score = 0;
    removeItem('highScore');
    highScore = 0;
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(18);
  text('Score: ' + score, 14, 30);
  fill('gold');
  text('High: ' + highScore, 14, 54);
  fill('#888');
  textSize(12);
  text('space=score  r=reset', 14, 76);
}`,
      },
    ],
  },
  {
    slug: 'patterns',
    title: 'Game Patterns',
    pages: [
      {
        title: 'Top-down movement',
        body: `For top-down games, set world.gravity.y = 0 so nothing falls. Move the player by writing to vel.x and vel.y based on the arrow keys.

Clamp the player's position to the canvas edges each frame so it can't leave the screen. A simple Math.max / Math.min pair handles this.

Setting vel to 0 when no key is pressed gives a snappy, arcade feel. For drifty movement, leave vel alone and add small amounts instead.`,
        code: `let player;
const SPEED = 4;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 30, 30);
  player.color = 'deepskyblue';
}

function update() {
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('left'))  player.vel.x = -SPEED;
  if (kb.pressing('right')) player.vel.x = SPEED;
  if (kb.pressing('up'))    player.vel.y = -SPEED;
  if (kb.pressing('down'))  player.vel.y = SPEED;

  player.x = Math.max(15, Math.min(385, player.x));
  player.y = Math.max(15, Math.min(385, player.y));
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Platformer jump',
        body: `A platformer needs gravity, a ground-check, and edge-triggered jump input. Keep the ground sprite in a variable so you can test player.colliding(ground) before jumping.

Use kb.pressing for continuous left/right motion, and kb.presses(' ') for the jump so one tap equals one jump.

For coyote time or double jumps, count frames since the last ground contact and allow jumps while that count is small.`,
        code: `let player, ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  player = new Sprite(200, 100, 30, 40);
  player.color = 'deepskyblue';
  ground = new Sprite(200, 380, 400, 20, 'static');
  new Sprite(120, 300, 80, 12, 'static');
  new Sprite(300, 240, 80, 12, 'static');
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -5;
  else if (kb.pressing('right')) player.vel.x = 5;

  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -9;
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Projectiles from a player',
        body: `Keep bullets in a Group so they share defaults and are easy to iterate. Setting group defaults (color, diameter, collider) once saves repeating yourself each spawn.

Spawn a new bullet with new bullets.Sprite(x, y) when the fire key is pressed. Give it a velocity so it flies across the screen.

Remove bullets once they leave the canvas — otherwise they pile up and slow the sketch down. Iterate a copy with [...bullets] so removing doesn't break the loop.`,
        code: `let player, bullets;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(60, 200, 30, 30);
  player.color = 'deepskyblue';

  bullets = new Group();
  bullets.diameter = 10;
  bullets.color = 'gold';
  bullets.collider = 'none';
}

function update() {
  if (kb.pressing('up'))        player.vel.y = -4;
  else if (kb.pressing('down')) player.vel.y = 4;
  else                          player.vel.y = 0;

  if (kb.presses(' ')) {
    const b = new bullets.Sprite(player.x + 20, player.y);
    b.vel.x = 8;
  }

  for (const b of [...bullets]) {
    if (b.x > 420) b.delete();
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Score and timer HUD',
        body: `Use plain variables to track game state: one for score, one for the remaining time. Increase the score when the player overlaps a collectible, and remove the collectible so it doesn't re-trigger.

Convert frameCount into seconds by dividing by 60 (the default frame rate). Math.max(0, ...) stops the timer clamping into negative numbers.

Draw the HUD in draw() after background() so it sits on top. Use fixed x/y coordinates so the HUD stays put if the camera scrolls.`,
        code: `let player, coins;
let score = 0;
const LIMIT = 20;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 30, 30);
  player.color = 'deepskyblue';

  coins = new Group();
  coins.diameter = 18;
  coins.color = 'gold';
  coins.collider = 'none';
  for (let i = 0; i < 6; i++) {
    new coins.Sprite(40 + i * 60, 80 + (i % 2) * 200);
  }
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else                           player.vel.x = 0;
  if (kb.pressing('up'))         player.vel.y = -4;
  else if (kb.pressing('down'))  player.vel.y = 4;
  else                           player.vel.y = 0;

  for (const c of [...coins]) {
    if (player.overlapping(c)) {
      score++;
      c.delete();
    }
  }
}

function draw() {
  background('#222');
  const timeLeft = Math.max(0, LIMIT - Math.floor(frameCount / 60));
  fill('white');
  textSize(18);
  text('Score: ' + score, 14, 26);
  text('Time: ' + timeLeft, 14, 50);
}`,
      },
      {
        title: 'Scene/state switching',
        body: `A single state variable is enough for most small games. Use strings like 'menu', 'play', and 'gameover' — they're easy to read in if/else branches.

In update(), branch on state to handle input for that scene only. In draw(), branch on state to render the right screen. Changing state is just state = 'play'.

Keep scene-specific sprites hidden or disabled when not in that scene. The simplest approach is to only create them when entering 'play' and remove them when leaving.`,
        code: `let state = 'menu';
let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 30, 30);
  player.color = 'deepskyblue';
  player.visible = false;
}

function update() {
  if (state === 'menu' && kb.presses(' ')) {
    state = 'play';
    player.visible = true;
  } else if (state === 'play') {
    if (kb.pressing('left'))       player.vel.x = -4;
    else if (kb.pressing('right')) player.vel.x = 4;
    else                           player.vel.x = 0;
    if (kb.presses('x')) state = 'gameover';
  } else if (state === 'gameover' && kb.presses(' ')) {
    state = 'menu';
    player.visible = false;
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(20);
  if (state === 'menu') {
    text('Press SPACE to start', 90, 200);
  } else if (state === 'play') {
    text('Press X to end', 14, 24);
  } else {
    text('Game Over', 140, 180);
    text('SPACE for menu', 115, 220);
  }
}`,
      },
    ],
  },
];

export function getSection(slug: string): DocSection | undefined {
  return coreGetSection(sections, slug);
}

export function getAllSectionSlugs(): string[] {
  return coreGetAllSectionSlugs(sections);
}

export function searchDocs(query: string, limit = 30): DocSearchResult[] {
  return coreSearchDocs(sections, query, limit);
}

export interface RelevantDoc {
  sectionTitle: string;
  pageTitle: string;
  body: string;
  code?: string;
}

export function findRelevantDocs(keywords: string[], maxPages = 6): RelevantDoc[] {
  const tokens = Array.from(
    new Set(
      keywords
        .map((k) => (k || '').toLowerCase().trim())
        .filter((k) => k.length >= 2),
    ),
  );
  if (tokens.length === 0) return [];

  const scored: { score: number; page: RelevantDoc }[] = [];
  for (const section of sections) {
    section.pages.forEach((page) => {
      const title = page.title.toLowerCase();
      const body = page.body.toLowerCase();
      const code = (page.code || '').toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (title.includes(t)) score += 5;
        if (code.includes(t)) score += 3;
        if (body.includes(t)) score += 1;
      }
      if (score > 0) {
        scored.push({
          score,
          page: {
            sectionTitle: section.title,
            pageTitle: page.title,
            body: page.body,
            code: page.code,
          },
        });
      }
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxPages).map((s) => s.page);
}
