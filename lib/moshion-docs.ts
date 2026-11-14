// In-app moSHion reference — hand-authored against the real public/moshion/moshion.js API.
// Content is written fresh, not mechanically renamed from the old moSHion docs, because the
// actual engine surface differs (planck.js-backed, gaps closed per the audit gate).

// Scope-out (stated explicitly so a future maintainer doesn't rediscover the boundary):
// These moSHion API areas are not in the engine, because no runnable lesson exercises them:
//   Visual / Visuals, EmojiImage, multitouch pointer/pointers,
//   world.renderStats / world.meterSize, palettes, world.timeScale / world.physicsTime /
//   world.realTime, world.rayCastAll, sprite.passes / pass, sprite.bearing,
//   sprite.addCollider / addDefaultSensors, sprite.playAni / playAnis (Promise-based),
//   sprite.grabbable, group.addTiles / tile, autoCull, group.life,
//   subgroups (Group(parent)), camera.zoom, contros (gamepad), pointer,
//   joint.springiness / damping / limitsEnabled / range / forceThreshold / torqueThreshold /
//   offsetA / offsetB, color(), triangle drawing primitive,
//   textFont, parseTextureAtlas, loadImage, EmojiImage,
//   sprite.addAnis, anis.cutFrames / offset.
// Built in the engine since this list was first written (public/moshion/docs/moshion.d.ts,
// checked against moSHion d8068bb on 2026-11-03), so no longer scoped out: world.autoStep /
// world.physicsUpdate, world.allowSleeping / sprite.sleeping, world.explodeAt,
// world.rayCast, world.getSpritesAt, sprite.angleTo, the sprite.update / sprite.draw
// overrides, sprite.drag / rotationDrag / applyTorque / rotationSpeed, group.amount /
// autoDraw / autoUpdate, camera.off / camera.on, and mouse.drags / dragging / dragged.
// Of these, only sprite.angleTo and camera.off have a page or a mention below; the rest
// are engine-only, with no page here yet.
// sprite.mass / density / opacity, sprite.moveTowards, sprite.rotateTo, sprite.debug, and
// frameRate() were in this list too — a lesson audit found them reachable
// (6-5-21, 5-1-23, and six sprite.text label lessons) and they're built now; see the
// sprite/physics/text sections and Canvas > frameCount below.
//
// A second pass removed more of the list, on a different criterion — not "a
// lesson runs it" but "a student reaches for it because the API's own shape
// promised it". Built and no longer scoped out:
//   group.cull (6-1-12-challenges already tells students to read these docs
//     for it), sprite.moveAway / attractTo / repelFrom / rotateTowards (the
//     opposites and siblings of methods the course teaches), the cascading
//     Group forms of those, mouse.left / center / right / pos, and
//     kb.shift / control / alt plus the other named-key properties.
// The moSHion 3b77bf6 sync (2026-10-31) added pages for Walls, Tiles (moSHion's
// legend form, not p5play's group.tile), sprite.addSensor, every / after, and the
// plain drawing shapes (square() now follows fill()).
// The moSHion d8068bb sync (2026-11-02) added the Coordinates section: world.origin =
// 'math' (centre, y up, counter-clockwise angles) and the showGrid() / showMouse()
// helpers. It follows the moSHion repo's docs/data/moshion-docs.js Coordinates pages;
// the default stays screen coordinates (top-left, y down), as in p5play.
// The moSHion 3f1e70a sync (2026-11-12, the API audit) updated pages rather than adding
// features: w/h resize the collider, group settings reach existing members, one table of
// touch verbs (sensors gained overlapped()), mouse verbs take a button, getSpriteAt takes
// a point and finds HUD sprites, world.rayCast with no callback, GrabberJoint.target, the
// collider spellings and the errors for a typo, 60 frames a second on any screen, and two
// new pages: "Fresh dice: random() and randomSeed()" and "Degrees for trig: angleMode()".
// If a future lesson needs one of the still-listed items, that's a new gap to close then.

import {
  searchDocs as coreSearchDocs,
  getSection as coreGetSection,
  getAllSectionSlugs as coreGetAllSectionSlugs,
  type DocSection,
  type DocSearchResult,
} from './docs-core';

export type { DocSection, DocSearchResult };

export const sections: DocSection[] = [
  {
    slug: 'overview',
    title: 'Overview',
    pages: [
      {
        title: 'What is moSHion?',
        body: `moSHion is a beginner-friendly 2D game engine for the web. It pairs a simple drawing canvas with real Box2D physics (via planck.js), so you can draw shapes and make them bump into each other without wiring the two worlds together yourself.

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
        body: `A moSHion sketch runs up to three functions on a loop. setup() runs once at the start — you make your canvas and your sprites there. update() runs every frame before physics steps — you read input and change velocities here. draw() runs every frame after physics — you clear the screen and draw any extras here.

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
        body: `moSHion runs in "global mode." That means Canvas, Sprite, world, kb, and friends are already on the page — you just use them. No import, no new Engine(), no setup boilerplate.

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

Combine frameCount with Math.sin or Math.cos to get smooth back-and-forth motion without any physics.

A game runs 60 frames a second on every screen, including 120 Hz and 144 Hz monitors, so frameCount, vel.x and every() mean the same thing on any computer. A slow computer can still fall below 60.

frameRate() (no arguments) returns how many frames per second your sketch is actually managing right now — call it inside draw() and print it if you want to see whether a busy scene is slowing things down.`,
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
        title: 'Time in seconds: deltaTime',
        body: `deltaTime is how many milliseconds passed since the last frame: about 16.7 when the game runs at 60 frames a second, more when the computer is slow. Divide by 1000 to get seconds.

That lets you write timing in seconds instead of counting frames. x += 120 * deltaTime / 1000 moves 120 pixels every second, and a cooldown can be a number of seconds that counts down by deltaTime / 1000 each frame, so 2.5 means two and a half seconds.

Counting frames still works too (frameCount, every(), 60 frames = 1 second). Use whichever reads more clearly for what you are making.`,
        code: `let cooldown = 0;   // seconds until you can dash again
let x = 40;

function setup() {
  new Canvas(400, 200);
}

function draw() {
  background('#222');
  let seconds = deltaTime / 1000;
  x += 60 * seconds;            // 60 pixels a second
  if (x > 380) x = 40;

  if (cooldown > 0) cooldown -= seconds;
  if (kb.presses('space') && cooldown <= 0) {
    x += 80;
    cooldown = 1.5;             // one and a half seconds
  }

  fill('gold');
  circle(x, 100, 30);
  fill('white');
  textSize(16);
  text(cooldown > 0 ? 'Dash in ' + cooldown.toFixed(1) + ' s' : 'Dash: READY (space)', 10, 24);
}`,
      },
      {
        title: 'Fresh dice: random() and randomSeed()',
        body: `random() with nothing in the brackets gives a number from 0 up to (not including) 1. random(10) gives one from 0 up to 10, random(5, 10) one from 5 up to 10, and random(['red', 'gold', 'lime']) picks one item from a list.

Every time you press Run, the numbers are different, so each playthrough deals a new level, a new enemy wave, a new set of stars.

To get the same numbers every run, call randomSeed(n) at the top of setup() with any whole number. The same seed always gives the same sequence. That helps when you are hunting a bug that only happens with one particular layout: seed it, and the layout comes back every time.`,
        code: `function setup() {
  new Canvas(400, 300);
  // randomSeed(7); // uncomment: the same stars every run
  for (let i = 0; i < 40; i++) {
    const star = new Sprite(random(400), random(300), random(2, 6));
    star.collider = 'none';
    star.color = random(['white', 'gold', 'lightblue']);
  }
}

function draw() {
  background('#112');
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
      {
        title: 'A colour with alpha',
        body: `A colour is a CSS string. fill(), stroke(), background() and a sprite's .color all take the same one, and the alpha can go inside it: 'rgba(255, 99, 71, 0.5)' is that red at half strength, with the alpha from 0 to 1. fill(), stroke() and background() also take numbers the way p5 does: fill(255, 99, 71) for red, fill(200) for light grey, and a fourth number for alpha, fill(255, 99, 71, 128), where the alpha runs from 0 to 255.

shCode adds two helpers so you do not have to build the string yourself. rgba(r, g, b, a) rounds and clamps the channels and the alpha, and randomColor(alpha) or randomColor(minAlpha, maxAlpha) picks a random colour for you. Both return a plain string, so they go anywhere a colour goes.`,
        code: `let dots = [];

function setup() {
  new Canvas(400, 400);
  for (let i = 0; i < 8; i++) {
    const d = new Sprite(random(60, 340), random(60, 340), 60);
    d.collider = 'none';
    d.color = randomColor(0.3, 1);
    dots.push(d);
  }
}

function draw() {
  background('#111');
  fill(rgba(255, 255, 255, 0.35));
  text('eight random colours', 12, 24);
}`,
      },
      {
        title: 'Drawing plain shapes',
        body: `Not everything on screen has to be a sprite. Inside draw() you can paint a shape straight onto the canvas: rect(x, y, w, h), square(x, y, size), circle(x, y, diameter) and line(x1, y1, x2, y2). These have no physics and nothing collides with them; they are just pixels, redrawn every frame after background().

rect and square are placed by their top-left corner. circle is placed by its centre, the same way a sprite is.

fill(color) sets the colour inside the next shapes, and stroke(color) sets the outline. noFill() and noStroke() turn either one off, and strokeWeight(n) makes the outline thicker. They stay set until you change them, so set the colour just before the shape it belongs to. square() follows fill() like every other shape: fill('deepskyblue') then square(...) draws a blue square.

A colour can be a name or string, fill('deepskyblue'), or numbers as in p5: fill(80, 250, 123) for green, fill(200) for grey. For a see-through colour add an alpha: fill(0, 0, 0, 120), where the alpha runs from 0 (clear) to 255 (solid), or the string fill('rgba(0, 0, 0, 0.5)'), where it runs from 0 to 1.`,
        code: `function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#222');

  noStroke();
  fill('deepskyblue');
  square(40, 60, 80);

  fill('tomato');
  circle(220, 100, 80);

  noFill();
  stroke('gold');
  strokeWeight(4);
  rect(280, 60, 80, 120);
  line(40, 240, 360, 240);
}`,
      },
    ],
  },
  {
    slug: 'coordinates',
    title: 'Coordinates',
    pages: [
      {
        title: 'Where is (0, 0)?',
        body: `By default, (0, 0) is the top-left corner of the canvas. x counts to the right and y counts DOWN, so a bigger y is lower on the screen. The browser's own canvas works this way, and so does p5play. These are called screen coordinates, and every sketch uses them unless you ask for something else.

If you are used to graphs from math class, where y goes up, this can feel upside down. Two helpers show you what is going on. showGrid(50) draws a light grid with a line every 50 pixels and the axes labelled, so you can see exactly where (0, 0) is and which way y grows. showMouse() writes the pointer's (x, y) right next to it. Call both from draw(), every frame. They only draw: nothing collides with the grid.

Move the mouse over the canvas and read the numbers: y gets bigger as you move down.`,
        code: `let box;

function setup() {
  new Canvas(400, 300);
  box = new Sprite(100, 50, 40, 40, 'static');
  box.color = 'deepskyblue';
}

function draw() {
  background('#222');
  showGrid(50);
  showMouse();
}`,
      },
      {
        title: 'Math mode: centre, y up',
        body: `Put world.origin = 'math' on the line right after new Canvas() and the canvas becomes the graph from math class. (0, 0) is the CENTRE of the canvas, x grows to the right and y grows UP. A positive rotation turns counter-clockwise, the way math measures angles from the +x axis.

Every number keeps its meaning but points the math way. vel.y = 5 moves a sprite up. direction = 90 points up. Gravity pulls toward smaller y, so a falling world is world.gravity.y = -10, with a minus sign, because down is negative now. The camera starts at (0, 0). Text and pictures still read the right way up, and showGrid() and showMouse() label the math numbers.

Set it first: before you make any sprite and before you set gravity. The engine will not move things that already exist, so setting it too late stops the sketch with an error that tells you to move the line up. Any value other than 'math' or 'screen' is an error too. 'screen' is the default, so you never need to write it.

In this example the ball starts 100 above the centre and falls onto the floor at y = -120.`,
        code: `let ball, floor;

function setup() {
  new Canvas(400, 300);
  world.origin = 'math';
  world.gravity.y = -10;

  ball = new Sprite(0, 100, 30);
  ball.color = 'tomato';
  ball.bounciness = 0.6;

  floor = new Sprite(0, -120, 300, 20, 'static');
  floor.color = 'gray';
}

function draw() {
  background('#222');
  showGrid(50);
  showMouse();
}`,
      },
      {
        title: 'Math mode: what else changes',
        body: `A tile map still reads top to bottom: the first string is the top row, and each row below it has a smaller y. new Walls() still calls the wall above the screen walls.top (its y is the bigger one) and the wall below it walls.bottom. A ground sensor under a player 40 tall is addSensor(0, -21, 26, 4), because down is negative now.

rect(x, y, w, h) covers x to x + w and y to y + h, so from its corner it grows right and UP. text(str, x, y) puts the bottom of the letters on y, and the letters sit above it, still the right way up.

drawTop() and camera.off() still draw in a frame that ignores the camera, but that frame is centred and y-up too: on a 400 by 300 canvas, text('Score', -190, 130) sits near the top-left corner. mouse.x and mouse.y are math numbers as well, so the mouse and the grid always agree.

Drive the player with the arrow keys and watch the camera follow. The grid moves with the world, so its labels always say where the player really is.`,
        code: `let walls, level, player;

function setup() {
  new Canvas(400, 300);
  world.origin = 'math';

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'gray';

  level = new Tiles([
    '#########',
    '#       #',
    '#   #   #',
    '#       #',
    '#########',
  ], -160, 80, 40, 40, { '#': walls });

  player = new Sprite(-80, 0, 24, 24);
  player.color = 'gold';
}

function update() {
  if (kb.pressing('right'))     player.vel.x = 3;
  else if (kb.pressing('left')) player.vel.x = -3;
  else                          player.vel.x = 0;

  if (kb.pressing('up'))        player.vel.y = 3;
  else if (kb.pressing('down')) player.vel.y = -3;
  else                          player.vel.y = 0;

  camera.x = player.x;
  camera.y = player.y;
}

function draw() {
  background('#222');
  showGrid(40);
}

function drawTop() {
  fill('white');
  textSize(14);
  text('x: ' + round(player.x) + '  y: ' + round(player.y), -190, 135);
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
        body: `A Sprite is the basic building block of any moSHion game. Every sprite has a position, a size, and (usually) a physics body that moves and collides automatically.

new Sprite(x, y, width, height) creates a rectangular sprite centered on (x, y). With no extra argument it's dynamic, meaning gravity pulls it and it bumps into other sprites. Gravity starts at 0, so this one stays where you put it until you set world.gravity.y.

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

'static' never moves and never reacts. Use it for floors, walls, and platforms. 'kinematic' moves only when you set its velocity — gravity ignores it. Use it for moving platforms and doors. 'none' turns physics off entirely — the sprite still draws, but nothing collides with it. Use it for cursors, UI, and decorations. A sprite with collider = 'none' is a sensor: you can still detect overlaps, but there's no physical pushback.

The type works on circles too: new Sprite(x, y, 30, 'static') is a static ball. Capital letters are fine ('Static'), and so is the first letter alone ('s'). A misspelt type such as 'statik' stops the sketch with an error that lists the four real ones, instead of quietly making a dynamic sprite. sprite.body and sprite.physicsType are older names for the same setting.`,
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

.visible = false hides a sprite without removing it — physics still runs. .layer controls draw order — higher layer values draw on top.

.opacity fades a sprite from 0 (invisible) to 1 (fully solid, the default) — good for a hit-flash, a fade-out before delete(), or a ghosted preview. .debug = true draws the sprite's actual physics collider as a lime outline, which is the fastest way to check whether the shape you're seeing matches the shape you're colliding with.`,
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
  front.opacity = 0.6;

  const ball = new Sprite(340, 200, 40);
  ball.color = 'tomato';
  ball.debug = true; // outlines the real collider, useful while tuning shapes
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Shape options',
        body: `moSHion picks the collider shape from the constructor arguments. Two numbers make a 50×50 square: new Sprite(x, y). Three numbers make a circle: new Sprite(x, y, diameter). Four numbers make a rectangle: new Sprite(x, y, w, h).

You can also pass a body type as the last argument: new Sprite(x, y, w, h, 'static').

new Sprite() with no numbers at all makes a 50×50 square in the middle of what the camera shows.

You can change the size later: .w and .h (or .width and .height, or .diameter for a circle) resize the sprite AND its collider, so what you see is what bumps into things. On a circle, setting either .w or .h sets both, because a circle has one size. .scale is different: it only changes how the sprite is drawn.

You can read .shape to check whether a sprite is 'circle' or 'rect', and set it to switch ('box' means the same as 'rect').`,
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
        title: 'Speed, direction, and moveTowards',
        body: `.speed and .direction are another way to read and set .vel, in polar form instead of x/y. .speed is how fast the sprite is moving (pixels per frame, always 0 or positive — a negative speed just points direction the other way). .direction is the heading in degrees, where 0 points right, 90 points down, matching .rotation's convention.

Setting .speed keeps the current direction; setting .direction keeps the current speed. That makes "turn without slowing down" or "speed up without turning" a one-line change instead of redoing the vector math.

sprite.moveTowards(x, y, tracking) nudges a sprite toward a point without touching physics at all — each call moves it tracking (default 0.1, so 10%) of the remaining distance. Call it once per update() frame for a smooth chase that naturally slows down as it arrives.`,
        code: `let hunter, target;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  hunter = new Sprite(60, 200, 30);
  hunter.color = 'tomato';
  hunter.collider = 'none';

  target = new Sprite(340, 200, 16);
  target.color = 'gold';
  target.collider = 'none';
}

function update() {
  target.x = 200 + Math.cos(frameCount / 40) * 150;
  target.y = 200 + Math.sin(frameCount / 40) * 150;
  hunter.moveTowards(target.x, target.y, 0.05);
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Chasing, fleeing, and pulling',
        body: `Two questions come first: how far away is it, and which way is it? sprite.distanceTo(other) gives the straight-line distance in pixels, and sprite.angleTo(other) gives the direction in degrees, measured the same way as sprite.rotation. Both take a pair of numbers or anything with x and y — another sprite, or mouse.

moveTowards has three relatives that work the same way, and all four accept either a pair of numbers or a target with .x and .y — so enemy.moveTowards(player, 0.02) is a complete chase.

moveTowards(target, tracking) closes that fraction of the remaining gap each call. moveAway(target, repel) is its mirror: it opens the gap by the same fraction. Both set position directly, so they ignore physics — the sprite arrives no matter what is in the way.

attractTo(target, force) and repelFrom(target, force) work through physics instead, applying a real force in newtons toward or away from the point. The sprite accelerates, keeps its momentum, and bounces off whatever it hits on the way. Use these when the pull should feel like gravity or magnetism rather than a leash.

rotateTowards(target, tracking) turns to face a point over several frames by setting a spin speed — unlike rotateTo, which steps or snaps the angle directly. Like rotateTo, it always turns the short way round.

Passing mouse itself (not mouse.x and mouse.y) is worth doing: the sprite then ignores the cursor until it has actually moved over the canvas, instead of lunging at the top-left corner on the first frame.`,
        code: `let hunter, prey, magnet;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  prey = new Sprite(200, 120, 18);
  prey.color = 'gold';
  prey.collider = 'none';

  hunter = new Sprite(60, 120, 22);
  hunter.color = 'tomato';
  hunter.collider = 'none';

  magnet = new Sprite(200, 300, 20);
  magnet.color = 'deepskyblue';
}

function update() {
  // prey runs from the cursor, hunter chases the prey
  prey.moveAway(mouse, 0.04);
  hunter.moveTowards(prey, 0.03);
  hunter.rotateTowards(prey, 0.2);

  // the blue one is pulled by physics, so it overshoots and swings back
  magnet.attractTo(mouse, 30);
}

function draw() {
  background('#222');
  fill('white');
  textSize(13);
  text('move the mouse', 14, 22);
}`,
      },
      {
        title: 'rotateTo',
        body: `sprite.rotateTo(angle, speed) turns a sprite toward angle, in degrees, using the shorter direction. Pass speed to cap how many degrees it turns per call — call it every update() frame and it eases into the target angle instead of snapping. Leave speed out and it snaps immediately, same as setting .rotation directly.

It returns a Promise, so await sprite.rotateTo(90) works if you like that style — but the rotation itself already happened by the time you'd await it, so most lesson code just calls it and moves on.`,
        code: `let turret;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  turret = new Sprite(200, 200, 60, 16);
  turret.color = 'slategray';
}

function update() {
  const dx = mouseX - turret.x, dy = mouseY - turret.y;
  const angleToMouse = Math.atan2(dy, dx) * 180 / Math.PI;
  turret.rotateTo(angleToMouse, 4); // turns at most 4°/frame toward the mouse
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Degrees for trig: angleMode()',
        body: `Every angle on a sprite is in degrees: rotation, direction, angleTo(). But cos(), sin() and tan() start out in radians, the unit math uses, where a half turn is PI (about 3.14) instead of 180. So cos(90) is not 0.

Call angleMode(DEGREES) once at the top of setup() and they switch to degrees: cos(90) is 0, sin(90) is 1, and atan2(y, x) gives its answer back in degrees. Now the angle a sprite faces goes straight into cos() and sin(): the example below fires a dot the way a spinning turret points.

angleMode(RADIANS) switches back, and angleMode() with nothing tells you which one is on.`,
        code: `let turret;

function setup() {
  new Canvas(400, 300);
  angleMode(DEGREES);
  turret = new Sprite(200, 150, 40, 12, 'static');
  turret.color = 'gold';
}

function update() {
  turret.rotation += 2;
  if (frameCount % 20 === 0) {
    const shot = new Sprite(turret.x, turret.y, 8);
    shot.collider = 'none';
    shot.vel.x = cos(turret.rotation) * 4;
    shot.vel.y = sin(turret.rotation) * 4;
    shot.life = 60;
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Images and emoji on sprites',
        body: `sprite.image = 'player.png' loads an image from a URL and draws it in place of the default colored shape. The image stretches to fill the sprite's width and height.

If the string has no dot in it, moSHion treats it as an emoji: sprite.image = '🧍' draws that emoji character centered on the sprite at the sprite's height as the font size. This is a quick way to get a visible character without loading assets.

Setting .image clears any active animation (sprite.texture), and vice versa — they're mutually exclusive.`,
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
      {
        title: 'Textures: named pixel art',
        body: `sprite.texture = 'coin' picks art by NAME instead of by URL. moSHion ships a catalog of 126 pixel-art textures, so you can give a sprite a picture without finding, hosting, or spelling a file path.

94 are stills; 32 are animated sprite sheets that simply play when you assign the name (see below). The terrain, things, battle, numbers and candy groups are newer: ground to build levels from, flags and switches, swords and shields, the digits 0-9 for a score or a die, and candy.

The names, by group —

characters: player, playerBeige, playerBeigeJump, playerBeigeWalk, playerBlue, playerBlueJump, playerBlueWalk, playerJump, playerPink, playerPinkJump, playerPinkWalk, playerWalk, playerYellow, playerYellowJump, playerYellowWalk, runner, runnerJump

pickups: coin, coinBronze, coinBronzeSpin, coinSilver, coinSilverSpin, coinSpin, gem, gemGreen, gemGreenSparkle, gemOrange, gemOrangeSparkle, gemSparkle, gemYellow, gemYellowSparkle, heart, heartBlink, heartHalf, heartLose, key, keyBlue, keyGreen, keyOrange, star, starTwinkle

blocks: block, bomb, cactus, crate, crateX, door, exitSign, mushroom, mushroomBrown, torch, torchFlicker

creatures: bat, batFly, bee, beeFly, bird, fish, fishPink, fishSwim, frog, ghost, ladybug, ladybugWalk, monster, slime, slimeBlue, snail, snailCrawl, worm

terrain: brick, brickTan, bush, grass, ice, lava, lavaDeep, rock, sand, snow, spikes, stone, tree, water, waterDeep

things: apple, flag, flagBlue, flagBlueWave, flagGreen, flagGreenWave, flagRed, flagRedWave, flagWave, lever, lock, lockGreen, sign, signArrow, spring

battle: blaster, boom, burst, burstBlue, burstGreen, burstOrange, shield, shieldGold, shieldSilver, sword, swordGold

numbers: num0, num1, num2, num3, num4, num5, num6, num7, num8, num9

candy: candyGreen, candyOrange, candyYellow, swirl, swirlMint

Animated ones to try: coinSpin (and coinSilverSpin, coinBronzeSpin), starTwinkle, gemSparkle (and gemGreenSparkle, gemYellowSparkle, gemOrangeSparkle), heartBlink, playerJump (one per player colour, like playerBlueJump), flagWave (one per flag colour), torchFlicker and boom.

Every animation loops unless you set sprite.texture.loop = false, which plays it once and stops on the last picture. Two are made to play once: heartLose (a heart flashes, then shows half) and boom (an explosion that grows and fades). Show them for one loop, then change the picture or remove the sprite. heartLose shows 6 pictures for 10 frames each, so after(60, () => heart.texture = 'heartHalf'). boom shows 6 pictures for 6 frames each, so after(36, () => blast.remove()).

Call textureNames() to print the list from inside a sketch, and hasTexture('coin') to check one name. A name that does not exist warns in the console and suggests near matches rather than failing silently, so a typo tells you what it was.

Reading sprite.texture gives back the texture itself. Its name is sprite.texture.name, so ask if (s.texture.name === 'coin'). An animated texture is controlled through the same name: sprite.texture.frameDelay is the speed (game frames per picture, lower is faster), sprite.texture.frame is the picture showing now, sprite.texture.loop = false plays it once, and sprite.texture.frameCount says how many pictures it has. A sprite with no texture reads back null. An animation made with addAni counts too: sprite.texture is whichever animation is showing. Setting .texture clears .image, and setting .image clears the texture.

Setting the texture a sprite already shows does nothing, so door.texture = 'openDoor' inside update() keeps the animation playing instead of starting it over every frame. Setting a different name starts that one at its first picture. To play the same one again from the start, set sprite.texture.frame = 0.

Textures draw with smoothing turned off, so a 21x21 tile stretched across a 50x50 sprite stays blocky instead of blurring. A plain .image still smooths.

Draw your own in the texture editor — the Textures tab in the sandbox, or the Textures link in the header. Open a built-in, change it, save it under any name. Save more than one frame and the texture ANIMATES: sprite.texture = 'myWalk' plays it, with no addAni call, because a saved animation is stored as the same horizontal frame strip addAni already slices.

In code, saveTexture('myGuy', dataUrl) stores a data: URL under a name, and from then on sprite.texture = 'myGuy' finds it — including in a later sketch, because it lives in the same store as storeItem(). A saved name beats a built-in one, so saving 'coin' replaces the built-in coin everywhere. deleteTexture('myGuy') forgets it. Keep saved art small: the store holds 64 KB per value and 512 KB in total, which is generous for pixel art and far too small for a photograph.

The built-in art is Kenney's "Platformer Art: Pixel Redux" pack, released under CC0 — public domain, free for classroom and commercial use alike.`,
        code: `let player, coins;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  player = new Sprite(200, 300, 48, 48);
  player.collider = 'none';
  player.texture = 'player';

  coins = new Group();
  for (let i = 0; i < 5; i++) {
    const c = new coins.Sprite(60 + i * 70, 120, 32, 32);
    c.collider = 'none';
    c.texture = 'coin';
  }

  console.log('textures available:', textureNames().length);
}

function update() {
  if (kb.pressing('left'))       player.x -= 3;
  else if (kb.pressing('right')) player.x += 3;

  for (let i = coins.length - 1; i >= 0; i--) {
    if (player.overlaps(coins[i])) coins[i].remove();
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Patterns: ground that repeats',
        body: `A picture on a big sprite stretches. A floor 400 pixels wide made from one small tile picture comes out smeared. sprite.pattern repeats the picture at its real size instead, starting from the sprite's top-left corner, so the floor looks like many tiles side by side.

moSHion ships two 16 by 16 tiles for this: '/moshion/assets/ground_tile.png' and '/moshion/assets/grass_tile.png'. sprite.pattern also takes any other picture path, or a canvas you drew on yourself in code.

A group takes a pattern too: platforms.pattern = '/moshion/assets/grass_tile.png' covers every platform, each one repeating from its own top-left corner. If the picture fails to load, the sprite keeps its plain color instead of disappearing.

If a sprite has an .image, a .texture or an animation as well, that draws instead of the pattern. Use pattern for surfaces like floors and walls, and texture or image for characters and objects.

A floor across the bottom of a 400 by 300 canvas looks like this:

let ground = new Sprite(200, 276, 400, 48, 'static');
ground.pattern = '/moshion/assets/ground_tile.png';`,
      },
    ],
  },
  {
    slug: 'physics',
    title: 'Physics',
    pages: [
      {
        title: 'Gravity and velocity',
        body: `world.gravity.y pulls every dynamic sprite downward. It starts at 0, so nothing falls until you set it. 10 feels roughly earth-like; leave it at 0 for top-down games, or try negative values for "upside-down" worlds.

Each sprite has a .vel vector with .x and .y components, measured in pixels per frame. At 60 fps, vel.x = 4 means the sprite moves 240 pixels per second. Reading .vel tells you how fast a sprite is moving; writing it overrides physics for that frame.

Assigning vel every frame is fine for player controls — you're telling the engine exactly what you want.

There's a top speed. No sprite moves faster than world.maxSpeed pixels per frame, which starts at 60. Set vel.x higher and the sprite settles to 60 on the next frame, and the console says so once. That's a safety limit so fast sprites can't skip through things in a single frame. The next page shows how to raise it, and what it costs.`,
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
        title: 'The speed cap: world.maxSpeed',
        body: `No sprite moves faster than world.maxSpeed pixels per frame. It starts at 60. Set vel.x = 150 and the sprite settles to 60 on the next frame, and the console says so once, naming world.maxSpeed.

The cap is there for a reason. A sprite that moves a long way in one frame can skip clean past a thin sprite between two frames without the two ever touching: a fast bullet can fly through an enemy. A moving solid (dynamic) sprite still stops at a static wall, because the physics engine checks that case between frames. A kinematic sprite, or one with collider = 'none', does not get that check.

To go faster, raise the cap in setup(), before you set the speed. Keep it as low as your game allows, and make thin targets a little thicker if a fast sprite misses them.`,
        code: `let ball;

function setup() {
  new Canvas(600, 200);
  world.maxSpeed = 120;   // pixels per frame; the default is 60
  ball = new Sprite(30, 100, 20);
  ball.vel.x = 100;       // over 60, allowed because of the line above
  new Sprite(590, 100, 20, 200, 'static');
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
        title: 'Walls around the canvas',
        body: `new Walls() puts four static walls just outside the edges of the canvas, so sprites bounce off the edges of the screen instead of falling out of it. The walls sit off screen, so you don't see them, and the whole canvas stays playable. Make them in setup(), after new Canvas().

What you get back is a Group of the four walls, and each one also has a name: walls.top, walls.bottom, walls.left and walls.right. player.colliding(walls) asks "is the player touching any edge?" and player.colliding(walls.bottom) asks "is it on the floor?"

new Walls(100) makes them thicker (the default is 50), which helps if something fast keeps slipping through. The walls stay where the canvas was when you made them; they do not follow the camera.`,
        code: `let walls;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;
  walls = new Walls();

  for (let i = 0; i < 10; i++) {
    const ball = new Sprite(40 + i * 35, 60 + (i % 3) * 40, 24);
    ball.bounciness = 0.8;
    ball.vel.x = i % 2 === 0 ? 6 : -6;
    ball.color = i % 2 === 0 ? 'tomato' : 'gold';
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Mass and density',
        body: `.mass is how heavy a sprite is — read it to see how physics will treat the sprite (a heavier sprite reacts less to the same applyForce push, see below). Setting .mass adjusts the sprite's density so its actual mass matches what you asked for. Static and kinematic sprites always have 0 mass, since gravity and pushes don't affect them.

.density is the more direct knob underneath .mass — mass is density times the sprite's area, so a bigger sprite at the same density weighs more. New sprites default to a density of 1.

You'll reach for .mass far more often than .density — it's the number that actually means something ("this rock should be twice as heavy as that crate").`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  new Sprite(200, 380, 400, 20, 'static');

  const feather = new Sprite(120, 80, 30);
  feather.color = 'lightyellow';
  feather.mass = 0.2;

  const rock = new Sprite(280, 80, 30);
  rock.color = 'gray';
  rock.mass = 5;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Drag (slowing down)',
        body: `.drag slows a sprite down on its own, with no wall or floor to rub against. It is the knob for a ball on a table seen from above, where gravity is 0 and nothing else would ever stop it. 0 means no slowing at all.

The number is a rate per SECOND, not per frame. At .drag = 1 a moving sprite keeps about a third of its speed after one second and nearly none after four. At .drag = 0.02 it keeps almost all of it: the sprite crosses the canvas and hits a wall long before it slows. A few landmarks: 0.02 is nearly frictionless, 1 is a pool table, 6 is sand or thick carpet.

.drag slows a sprite but never stops it exactly, because it only ever removes a share of what is left. To make a sprite really stop, check .speed each frame and set it to 0 once it is small enough.

.friction is a different knob: it only acts while two sprites touch. .drag works everywhere, all the time.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  const slick = new Sprite(40, 130, 24);
  slick.color = 'lightblue';
  slick.drag = 0.02;
  slick.vel.x = 6;

  const table = new Sprite(40, 200, 24);
  table.color = 'lightgreen';
  table.drag = 1;
  table.vel.x = 6;

  const sand = new Sprite(40, 270, 24);
  sand.color = 'khaki';
  sand.drag = 6;
  sand.vel.x = 6;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Applying forces',
        body: `sprite.applyForce(fx, fy) pushes a sprite with a force in newtons — the physics engine's own force unit, not pixels. Pass the x and y components as two separate numbers. Call it every frame for continuous thrust, or once for a shove.

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

Use colliding for ground checks, walls, and enemies that block the player. Use overlapping for coins, goal zones, power-ups, and other triggers that shouldn't shove the player.

overlaps() is a question you ask, not a setting you turn on. a.overlaps(b) answers "are these touching right now?" and changes nothing, so calling it once in setup() does not make a and b pass through each other (in p5play it does). To let a coin, a pickup or a bullet pass through, set its collider to 'none'; then ask overlaps() or overlapping() every frame in update() to find out when something reaches it.

The six questions follow one pattern. The -s word is the first frame, the -ing word counts frames while it lasts, and the -ed word is the frame it ends:

collides(b), colliding(b), collided(b) — the physical bodies touching.
overlaps(b), overlapping(b), overlapped(b) — the shapes overlapping, whatever the colliders.

overlaps() is the one exception: it is true on every frame the two overlap, not only the first. For the first frame only, ask overlapping(b) === 1.`,
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
        body: `sprite.overlaps(other) returns true if the two sprites intersect (bounding-box math for rectangles, real circle-distance math for two circles). Pass a Group and it returns true if any member overlaps.

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

If you need to know which sprite was hit, pass a callback, which works on all six questions: player.collides(enemies, (p, e) => e.delete()). Or iterate the group yourself and test one-by-one. When you delete sprites in response to a hit, loop over [...group] (a copy) so the shrinking group doesn't skip items.`,
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
      {
        title: 'Ground sensors',
        body: `player.colliding(ground) is true whenever the player touches the ground anywhere: standing on it, but also pressed against it from the side or bumping it from below. If the floor, the walls and the ceiling are all one group, a jump check written with colliding() lets the player climb a wall by jumping against it.

A sensor fixes that. sprite.addSensor(offsetX, offsetY, w, h) adds a box that rides on the sprite and only detects: it pushes nothing and weighs nothing. Put a thin one just under the player's feet, and feet.overlaps(walls) is true only when something is under them.

The offsets are measured from the sprite's centre. For a player 40 tall, the feet are 20 below the centre, so a strip 4 tall at offset 21 sits just under them. Make it a little narrower than the player so it doesn't touch a wall beside them.

A sensor has three questions: feet.overlaps(walls) (true or false), feet.overlapping(walls) (how many frames it has been touching) and feet.overlapped(walls) (true on the frame it stops touching: the moment the player leaves the ground). Each takes a callback too, like a sprite's: feet.overlaps(walls, (sensor, wall) => { ... }). feet.remove() takes it off again; deleting the sprite does that too.

Another way to ask "is something under me?" is a ray: world.rayCast(player.x, player.y + 21, player.x, player.y + 27) looks along that short line and gives back what it hits first, or null if nothing is there. It looks straight through sensors and collider 'none' sprites, so a coin under your feet does not count as ground.`,
        code: `let player, walls, feet;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'slategray';
  new walls.Sprite(200, 290, 400, 20);
  new walls.Sprite(300, 200, 20, 160);
  new walls.Sprite(120, 150, 120, 16);

  player = new Sprite(100, 240, 30, 40);
  player.color = 'deepskyblue';
  player.rotationLock = true;
  feet = player.addSensor(0, 21, 26, 4);
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  else                           player.vel.x = 0;

  if (kb.presses('up') && feet.overlaps(walls)) {
    player.vel.y = -8;
  }
  player.color = feet.overlaps(walls) ? 'deepskyblue' : 'orange';
}

function draw() {
  background('#222');
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

Settings for how a sprite looks and what it is made of also change the sprites already in the group: enemies.color = 'red' turns every current enemy red, and the next one made too. That covers color, stroke, layer, visible, opacity, scale, text, size (w, h, diameter), collider, bounciness, friction, density and drag. A group's scale can change one direction on its own: walls.scale.y = 3 makes every wall three times as tall and leaves its width alone, and walls.scale = 2 sets both. Where a sprite is and how it moves (x, y, vel, rotation, life) only set the starting value for new sprites, and so does any property you invent yourself, like enemies.hp = 3.

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
        title: 'Copying a sprite: clone()',
        body: `sprite.clone() makes a new sprite that looks and behaves like one you already set up: the same size and shape, colour and outline, picture, texture or animation, layer, rotation, and the same physics settings (collider, bounciness, friction, density, drag). It also joins every group the original is in, so a check like player.colliding(pipes) sees the copy too.

The copy is made in the same spot and starts still. Move it straight away, in the same function: two solid sprites on top of each other push apart on the next frame. It does not copy motion, life, joints, or properties you made up yourself, like hp or points. Set those on the copy.

clone() is for "one more like that one". For many sprites that share settings from the start, a group's factory (new pipes.Sprite(...)) is still the tidier tool.`,
        code: `let pipes, upper, lower;

function setup() {
  new Canvas(400, 400);
  pipes = new Group();
  upper = new pipes.Sprite(300, 60, 50, 120, 'kinematic');
  upper.color = 'green';
  upper.stroke = 'darkgreen';
  upper.strokeWeight = 3;

  lower = upper.clone();   // same size, colour, outline, collider, groups
  lower.y = 340;           // move it before the next frame
}

function draw() {
  background('skyblue');
  text(pipes.length + ' pipes', 10, 20);
}`,
      },
      {
        title: 'Tile maps from text',
        body: `new Tiles(map, x, y, w, h, legend) builds a level out of rows of text. map is an array of strings, one per row. legend says which Group each character builds: { '#': walls, 'c': coins }. Any character the legend doesn't name, like a space or a dot, is an empty cell.

Each tile is made with new group.Sprite(), so the group's defaults apply exactly as if you had made it by hand: walls.collider = 'static' makes every wall static, and coins.diameter = 14 makes every coin a small circle instead of a full tile.

x and y are the centre of the top-left tile, the same way a sprite's x and y are its centre, and w and h are the size of one tile. For 40-pixel tiles starting in the canvas corner, pass 20, 20, 40, 40.

What you get back is itself a Group holding every sprite it made, so level.delete() clears the whole level when you want to load the next one.`,
        code: `let walls, coins, player, level;
let score = 0;

function setup() {
  new Canvas(400, 240);
  world.gravity.y = 10;

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'slategray';

  coins = new Group();
  coins.collider = 'none';
  coins.diameter = 14;
  coins.color = 'gold';

  level = new Tiles([
    '##########',
    '#        #',
    '#  c  c  #',
    '#  ##  c #',
    '# c      #',
    '##########',
  ], 20, 20, 40, 40, { '#': walls, 'c': coins });

  player = new Sprite(60, 100, 20, 28);
  player.color = 'deepskyblue';
  player.rotationLock = true;
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -3;
  else if (kb.pressing('right')) player.vel.x = 3;
  else                           player.vel.x = 0;
  if (kb.presses('up')) player.vel.y = -6;

  player.overlaps(coins, (p, coin) => {
    coin.delete();
    score++;
  });
}

function draw() {
  background('#112');
  fill('white');
  textSize(14);
  text('coins: ' + score, 50, 32);
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
        title: 'Culling sprites that leave the screen',
        body: `Every spawner has the same problem: sprites that drift off the edge are invisible but still alive, still costing physics every frame. Left alone, a game that fires a bullet every 10 frames is dragging thousands of dead bullets around after a few minutes.

group.cull(margin) deletes the members that have gone that far outside the canvas, and returns how many it deleted. cull(0) means "the moment they leave", cull(50) gives them a 50-pixel grace border so a sprite that is only halfway off doesn't vanish mid-view.

Give it a function and it runs that instead of deleting: cull(0, s => s.y = 0). That's how you wrap a sprite around to the other side, or send it back to the spawn point, rather than destroying it. The sprite stays in the group either way.

It measures against the camera, so a scrolling game culls against what's actually on screen, not against the origin.`,
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
  for (const d of drops) d.y += 3;

  // one line replaces the remove-while-iterating loop
  drops.cull(20);
}

function draw() {
  background('#112');
  fill('white');
  textSize(14);
  text('alive: ' + drops.length, 14, 22);
}`,
      },
      {
        title: 'Sound',
        body: `loadSound('file.mp3') gives you a Sound. Call .play() for a one-off effect and .loop() for music that should keep going.

moSHion ships a small 8-bit palette you load by name, no path needed: loadSound('coin') is a short chime and loadSound('music') is a short tune. There are also jump, hit, laser, powerup, explode, blip, select and tone, with title, win and lose for menus. For board and battle games there are dice, step, sword, clang, potion, levelup, crown, whoosh, pop and door. Every one is in the Library under Built in, where you can play it and copy the line that loads it. The longer path, loadSound('/moshion/assets/coin.wav'), still works. A sound that cannot load never plays, and the console says why.

The sound mixer at /sound (also the Sounds tab beside a moSHion lesson's code) builds a sound from a chip preset and saves it, and Import a clip there saves your own MP3, WAV or OGG file. Load a saved sound by its name, exactly as you saved it, capitals too, and without .mp3: let zap = loadSound('zap');. A sound you save under a built-in name, like coin, plays instead of the built-in one. A saved sound can be about 190 KB at most, which is a few seconds of effect or a short music loop, not a whole song: for music, save a short loop and play it with .loop(). A link to a sound on another website does not work here; download the file and import it instead.

.play() starts a fresh copy every time it's called, so firing a laser three times in three frames gives you three overlapping shots rather than one restarting over and over. .loop() is the opposite — it's the single track you start once and stop later, and calling it again while it's already going does nothing.

.volume runs 0 to 1. .pan runs -1 (hard left) to 1 (hard right), so a sound can come from where the thing is: enemy.x < player.x ? -0.6 : 0.6. .rate is playback speed, and because it shifts the pitch too it's the cheapest way to get variety out of one sound: coin.rate = 1 + Math.random() * 0.3 makes every pickup sound slightly different. masterVolume(0.5) halves everything at once without touching any individual .volume — that's your mute button.

.fade(to, seconds) ramps the volume instead of jumping it. music.fade(0, 2) is a two-second fade out, and it stops the sound when it lands so nothing keeps running silently.

If you have a lot of short effects, put them in one file and describe where each one lives: loadSound('sfx.mp3', { clips: { jump: [0, 0.25], hit: [0.5, 0.9] } }), then sfx.play('jump'). One download instead of a dozen. A clip name you haven't defined plays nothing, rather than blasting the whole file.

Two things that will confuse you the first time. Sound files have to download before they can play, so a .play() in the first moment of a sketch is silently ignored — that's why you load in setup() and play on an event. .loop() is the exception: it remembers, and starts as soon as the file arrives, because music.loop() in setup() would otherwise never play at all.

And browsers refuse to make any noise until the player has clicked or pressed a key. moSHion unlocks the audio automatically on the first input, so mostly you won't notice — but it does mean a sound cannot play before the player has touched anything.`,
        code: `let coin, music, player, coins;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;

  coin = loadSound('coin');
  music = loadSound('music');
  music.volume = 0.3;

  player = new Sprite(60, 150, 24, 24);
  player.color = 'deepskyblue';
  player.collider = 'none';

  coins = new Group();
  coins.diameter = 14;
  coins.color = 'gold';
  coins.collider = 'none';
  for (let i = 0; i < 4; i++) new coins.Sprite(140 + i * 60, 150);
}

function update() {
  player.moveTowards(mouse, 0.08);

  coins.overlaps(player, (c) => {
    coin.rate = 1 + Math.random() * 0.3;   // a slightly different chime each time
    coin.pan = (c.x - 200) / 200;          // and it comes from where the coin was
    coin.play();
    c.delete();
  });

  // safe to call every frame — loop() only ever starts one voice
  music.loop();

  // fade the music down as the coins run out
  if (coins.length === 1 && music.volume > 0.1) music.fade(0.05, 1.5);
}

function draw() {
  background('#111');
  fill('white');
  textSize(13);
  text('click to start the music, move to collect', 14, 24);
}`,
      },
      {
        title: 'The allSprites group',
        body: `allSprites is a built-in Group that every sprite joins automatically the moment it's created. You never construct it — it's already there as soon as moSHion loads.

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
        body: `You aren't limited to moSHion's built-in properties. Assign any property you like on a group and it becomes a default for every sprite spawned afterward — enemies.hp = 3 gives every new enemy an hp of 3.

Each sprite gets its own copy of the value on spawn, so changing one enemy's hp doesn't affect the others. The group just holds the template.

This is how you keep gameplay data attached to the right sprite. Tag sprites with custom fields like .hp, .score, .kind, or anything else your game needs, and read them back off the individual sprite during collisions.

Pick names the sprite doesn't already use. A sprite has built-in properties, and a field with the same name drives the built-in one instead of making a new field: speed sets its velocity (and reads back 0 on a static sprite), life deletes it after that many frames, direction turns it, and text draws a label on it. The same goes for color, scale, mass, x, y, w, h, d, r, width, height, visible and removed. Use names like hp, moveSpeed, heading or label. This matters most in a class that extends Sprite, where this.speed = 5 looks like your own field and isn't.`,
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

Key names are lowercase strings: 'left', 'right', 'up', 'down', 'a', 'w', 'enter', 'shift', 'escape', and either 'space' or ' ' for the space bar. Spelling is forgiving — 'space', 'ArrowRight' and 'arrowright' all find the key they name.

'left', 'right', 'up' and 'down' answer for the arrow key OR its WASD twin, so kb.pressing('left') is true whether the player pressed the left arrow or 'a'. You get both control schemes without writing either one twice.

Two players on one keyboard need the opposite: W must move only one of them. Name the arrow itself and it answers for the arrow only: 'arrowUp', 'arrowDown', 'arrowLeft' and 'arrowRight' for one player, 'w', 'a', 's' and 'd' for the other.

There are shorthand properties too: kb.space, kb.enter, kb.shift, kb.arrowUp and friends give the same number kb.pressing() would.

Arrow keys and space bar are automatically prevented from scrolling the page.`,
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
        title: 'Holding a key',
        body: `kb.pressing('key') isn't just true/false — it's the number of frames the key has been held (0 when idle), so it's still truthy in an if-check but also useful as a charge-up timer.

kb.holds('key') fires exactly once, the frame the hold crosses kb.holdThreshold (12 frames by default — about a fifth of a second at 60fps). kb.holding('key') is the frame count while held past that threshold (0 before it). kb.held('key') fires exactly once, the frame the key comes back up after having been held past the threshold — use it to tell a quick tap apart from a held press.

mouse has the same four: mouse.holds(), mouse.holding(), mouse.held(), mouse.holdThreshold.`,
        code: `let charge = 0;

function setup() {
  new Canvas(400, 200);
}

function update() {
  if (kb.holds(' ')) charge = 0;
  if (kb.holding(' ')) charge = kb.holding(' ');
  if (kb.held(' ')) console.log('released a full charge:', charge);
}

function draw() {
  background('#222');
  fill('gold');
  textSize(16);
  text('hold space — charge: ' + charge, 14, 24);
}`,
      },
      {
        title: 'Mouse position and buttons',
        body: `mouse.x and mouse.y are the cursor's position in world coordinates (already camera-aware).

mouse.pressing() returns true while any mouse button is held. mouse.presses() is true only on the first frame of a click — use it for single-shot actions. mouse.released() is true on the frame the button is released.

To tell the buttons apart, give the button's name: mouse.presses('right') is the first frame of a right-click, mouse.pressing('left') is true while the left button is held, and the same works for 'center' and for released(). With nothing in the brackets they answer for any button. mouse.left, mouse.center and mouse.right also count how many frames each button has been held. mouse.pos is the cursor as an {x, y} object, handy for passing straight to a method that takes a target.

mouse.x and mouse.y are world coordinates — they already include the camera, so comparing them to a sprite's x and y always works. mouse.canvasPos is the same cursor measured in screen pixels instead. Use it for anything pinned to the screen rather than the world, like a HUD button: once the camera scrolls, mouse.x is somewhere out in the level while canvasPos is still where the cursor looks like it is.

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
        title: 'Touch: a finger drives the mouse',
        body: `A single touch drives exactly the same mouse properties — mouse.x, mouse.y, mouse.presses(), mouse.pressing(), mouse.released(). A sketch written against the mouse works on a phone or tablet with no changes at all.

Three things a tap does, all at once: it moves the cursor to where you touched, it starts a press (so mouse.presses() fires on that frame, reading the touch position), and it stops the page from scrolling or zooming out from under the canvas. Dragging a finger across the canvas keeps the press held and keeps mouse.x/y following the finger, like holding the left button down.

Multi-touch is deliberately not mapped. A second finger changes nothing, and there is no touch gesture that stands in for the right mouse button — a sketch that needs two buttons needs a keyboard as well. mouse.isActive also turns true on the first touch, exactly as it does on the first mouse move.`,
        code: `let dot;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  dot = new Sprite(200, 200, 40);
  dot.color = 'white';
  dot.collider = 'none';
}

function update() {
  dot.x = mouse.x;
  dot.y = mouse.y;
  dot.color = mouse.pressing() ? 'gold' : 'white';
}

function draw() {
  background('#222');
}

function drawTop() {
  fill('white');
  textSize(14);
  text('tap or drag anywhere', 14, 22);
}`,
      },
      {
        title: 'Hit-testing with the mouse',
        body: `world.getSpriteAt(x, y) returns the top-most sprite at that world position, or undefined if nothing is there: the highest layer, and between two on the same layer, the one made later (the one drawn on top). It checks both circles (radius test) and rectangles (bounding box). It also takes a point, world.getSpriteAt(mouse), and it finds a screenSpace HUD sprite where it is drawn, even after the camera has scrolled.

world.getSpritesAt(x, y) returns every sprite there, top-most first.

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
        title: 'Stiff hinges and limits',
        body: `A plain hinge swings freely, so a body built from hinges (a ragdoll, a robot arm) goes floppy. Two settings fix that.

stiffness, from 0 to 1, is how hard the hinge tries to stay in the pose it started in. 0 (the default) is floppy. 1 holds a limb up against gravity and springs it back after a hit. Something in between sags a little.

lowerLimit and upperLimit stop the hinge at an angle, in degrees, counted from the starting pose in the same direction as rotation. An elbow that only bends one way is { lowerLimit: 0, upperLimit: 140 }. Set one to null to take that limit off.

Pass them in the options, new HingeJoint(a, b, { stiffness: 0.6, lowerLimit: -45, upperLimit: 45 }), or change them later: elbow.stiffness = 0. joint.angle tells you how far it has turned from the starting pose.

Put the anchor where the two parts really meet (a shoulder, a knee). Without one, the pivot is the middle of the first sprite.`,
        code: `let elbow;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  const shoulder = new Sprite(120, 100, 16, 16, 'static');
  const upper = new Sprite(170, 100, 100, 18);
  const lower = new Sprite(260, 100, 80, 14);
  upper.color = 'khaki';
  lower.color = 'orange';

  new HingeJoint(shoulder, upper, { anchor: { x: 120, y: 100 }, stiffness: 1 });
  elbow = new HingeJoint(upper, lower, {
    anchor: { x: 220, y: 100 },
    stiffness: 0.5,
    lowerLimit: 0,
    upperLimit: 120,
  });
}

function draw() {
  background('#222');
  // Hold the mouse down to make the elbow floppy.
  elbow.stiffness = mouse.pressing() ? 0 : 0.5;
  text('elbow: ' + round(elbow.angle) + ' degrees', 10, 20);
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
        body: `A GrabberJoint pulls a physics sprite toward a target point with a spring force. It's how you drag boxes around in a physics puzzle: the box swings and tumbles on the way instead of teleporting.

Create it with new GrabberJoint(anchorSprite, draggedSprite, options). The anchor is any static sprite; the pull starts at the dragged sprite. Pass { maxForce: 200 } to control how strong the pull is — higher values feel snappier.

Move the target by setting joint.target to a point. grab.target = mouse every frame drags the sprite after the cursor.

Call joint.delete() (or joint.remove()) to let go.`,
        code: `let box, anchor, grab;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');

  anchor = new Sprite(0, 0, 4, 4, 'static');
  anchor.visible = false;

  box = new Sprite(200, 300, 50, 50);
  box.color = 'deepskyblue';
}

function update() {
  if (mouse.presses() && world.getSpriteAt(mouse) === box) {
    grab = new GrabberJoint(anchor, box, { maxForce: 200 });
  }
  if (grab) grab.target = mouse;
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
        body: `moSHion supports minimal sprite-sheet animation. sprite.addAni(name, sheetUrl, frameCount) loads a horizontal frame strip from an image URL and registers it under the given name. The first addAni call auto-activates that animation.

sprite.changeAni(name) switches to a previously registered animation. If the name isn't found, nothing changes, and the console says so once, listing the names the sprite does have — a misspelt name otherwise looks just like a frozen sprite.

The sheet can also be the name of a texture: sprite.addAni('walk', 'myWalk') uses an animation you drew in the Texture editor, with its own frames and durations, so you can switch between two drawn animations with changeAni. Give a frame count to override it.

frameDelay controls how many game frames each animation frame is held for (default 4). Set it on the animation addAni returns, or on sprite.texture.frameDelay: after addAni, sprite.texture is the animation showing, and sprite.texture = 'fly' switches to the sprite's own animation called 'fly', the same as changeAni('fly'). (sprite.ani is an older name for the same thing and still works.)

loop is true by default, so an animation repeats forever. Set sprite.texture.loop = false to play it once and stop on the last frame, like a door that opens and stays open. Set sprite.texture.loop to a number to play it that many times, so sprite.texture.loop = 3 plays three times and then stays on the last frame. Set sprite.texture.frame = 0 to play it again (the count starts over). The same works for a texture drawn in the Textures tab: after sprite.texture = 'openDoor', use sprite.texture.loop = false.

sprite.texture.frame is the frame showing, starting at 0. Set it to jump: sprite.texture.frame = 2 shows the third frame from the start of its time on screen, and -1 is the last frame. sprite.texture.tick is how many game frames the current frame has been showing; set it after frame to start part-way through a frame that lasts more than one (sprite.texture.frame = 1; sprite.texture.tick = 1; is the second game frame of frame 1). Both work on an animated texture you drew in the Texture editor too.

Setting sprite.image clears any active animation, and vice versa — they're mutually exclusive.`,
        code: `let ghost;

function setup() {
  new Canvas(400, 400);

  ghost = new Sprite(200, 200, 80, 80);
  ghost.collider = 'none';

  // Two frame strips that ship with moSHion.
  // 'idle' is the first addAni, so it starts playing straight away.
  ghost.addAni('idle', '/moshion/assets/ghost_idle.avif', 7);
  const fly = ghost.addAni('fly', '/moshion/assets/ghost_fly.avif', 4);
  fly.frameDelay = 3; // flap a little faster than the default 4
}

function update() {
  // hold the right arrow (or D) to fly; let go to hover
  if (kb.pressing('right')) {
    ghost.x += 2;
    if (ghost.x > 440) ghost.x = -40; // wrap back to the left edge
    ghost.changeAni('fly');
  } else {
    ghost.changeAni('idle');
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

For a different typeface, bold, italic, underlines, outlines and wrapped lines, see the next three pages: Fonts, Weight and style, and Lines, outlines and spacing.

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
  text('moSHion', 200, 80);

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
        title: 'Fonts: textFont()',
        body: `textFont('name') picks the typeface for the text() calls that follow. Like textSize(), it lasts until you change it.

The built-in fonts:
'sans' clean and plain
'serif' like a book
'code' code, every letter the same width
'rounded' soft round ends
'pixel' pixel art
'arcade' old arcade screens
'handwriting' written with a marker
'comic' comic book
'bubbly' round and bubbly
'space' sci-fi
'spooky' dripping horror
'slab' thick square feet
'blocky' big blocky signs
'script' joined-up handwriting
'tall' tall and narrow

textFont('monospace') goes back to the default font. fontNames() lists every name textFont() knows, including fonts you saved in your Library.

A name it does not know prints "No font named ..." in the console once, and the text keeps the font it had. Check the spelling: font names are in quotes and are case-sensitive.

Fonts load while your sketch starts. The preview waits a moment for the fonts named in textFont('...'), so the first frame is right. A name built up from pieces (textFont('pix' + 'el')) works too, but can show the default font for a moment first.`,
        code: `function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#1b1d2a');
  fill('white');
  textSize(26);

  textFont('arcade');
  text('GAME OVER', 20, 50);

  textFont('handwriting');
  text('Nice try!', 20, 110);

  textFont('spooky');
  fill('limegreen');
  text('The swamp wins', 20, 170);

  textFont('rounded');
  fill('gold');
  text('Score: 120', 20, 230);
}`,
      },
      {
        title: 'Weight and style: textWeight(), textStyle()',
        body: `textWeight(n) sets how thick the letters are, from 100 (thin) to 900 (heavy). 400 is normal and 700 is bold. A font that does not have the weight you ask for uses its nearest one: 'sans' goes all the way from 100 to 900, but 'arcade' only has one weight.

textStyle(BOLD) is weight 700, textStyle(ITALIC) slants the letters, textStyle(BOLDITALIC) does both, and textStyle(NORMAL) goes back to plain, upright, weight 400. Each textStyle() call replaces the last one, so textStyle(ITALIC) followed by textStyle(BOLD) is just bold. For both, use BOLDITALIC.

To get slanted AND a particular weight, call textStyle(ITALIC) first, then textWeight(): textWeight() only changes the weight.`,
        code: `function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#1b1d2a');
  fill('white');
  textFont('sans');
  textSize(22);

  textStyle(NORMAL);
  for (let i = 0; i < 5; i++) {
    let w = 100 + i * 200;
    textWeight(w);
    text('weight ' + w, 20, 40 + i * 34);
  }

  textStyle(ITALIC);
  textWeight(800);
  fill('orange');
  text('slanted and heavy', 20, 250);
}`,
      },
      {
        title: 'Lines, outlines and spacing',
        body: `A '\\n' inside the words starts a new line: text('Line one\\nLine two', 20, 40).

textWrap(width) breaks long text onto new lines so it fits inside width pixels, between words. textWrap(width, CHAR) may break in the middle of a word, which suits a name with no spaces. textWrap() turns wrapping off.

textLeading(px) is the distance from one line to the next. textLeading(null) goes back to the normal gap (1.25 times the text size).

textDecoration(UNDERLINE) draws a line under the text, textDecoration(STRIKETHROUGH) a line through it, textDecoration(UNDERLINE, STRIKETHROUGH) both, and textDecoration(NONE) neither. The line is the text's colour.

textOutline('black', 3) draws a 3-pixel outline around every letter, which makes words easy to read on a busy background. textOutline() turns it off.

textSpacing(px) puts extra pixels between the letters (a negative number squeezes them together). textSpacing(0) is normal.

All of these last until you change them, like textSize(), and they work with textAlign(), textLayer() and every font.`,
        code: `function setup() {
  new Canvas(400, 320);
}

function draw() {
  background('#3a6');
  textFont('bubbly');
  textSize(30);
  fill('white');
  textOutline('black', 4);
  textAlign(CENTER);
  text('LEVEL 2', 200, 50);
  textOutline();

  textAlign(LEFT);
  textFont('sans');
  textSize(16);
  fill('#112');
  textWrap(220);
  textLeading(22);
  text('Collect every coin before the timer runs out. Watch out for the bats!', 20, 100);
  textWrap();
  textLeading(null);

  textDecoration(UNDERLINE);
  text('Press SPACE to start', 20, 220);
  textDecoration(NONE);

  textSpacing(6);
  text('S P A C E D', 20, 270);
  textSpacing(0);
}`,
      },
      {
        title: "HUDs that don't scroll",
        body: `When you move camera.x to follow the player, everything drawn inside draw() scrolls with the world — including your score text. And there is a second, quieter problem: the engine draws every sprite AFTER draw(), so anything draw() paints lands underneath the sprites — a score in the top-left corner disappears behind whatever wall happens to be up there.

drawTop() is the answer to both. It runs after the sprites are on the canvas, with the camera off for its duration, so text('Score: ' + score, 10, 24) means 10 pixels from the canvas edge and lands on top of the world. Define it like any other hook — the engine calls it every frame if it exists, and a sketch without it runs exactly as before.

camera.off() around drawing inside draw() still works for positioning, and it is still the right tool when you want something under the sprites on purpose (a vignette, a floor grid). But a HUD wants drawTop().`,
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
}

function drawTop() {
  fill('white');
  textSize(16);
  text('x: ' + Math.round(player.x), 10, 24);
}`,
      },
      {
        title: 'Text between sprites: textLayer()',
        body: `Text drawn in draw() goes under every sprite, and drawTop() puts it over all of them. To put words in between (a sign over the player but behind a tree), give the text a layer, the same way you give a sprite one.

textLayer(5) works like textSize(): every text() you write after it in draw() goes on layer 5. It is painted over every sprite whose layer is 5 or lower, and under every sprite whose layer is higher. Change the number to move the text up or down. textLayer() with nothing in the brackets puts text back under every sprite.

Text is not a sprite, so text.layer = 10 does nothing: write textLayer(10) instead. drawTop() is still the place for a score or a timer, because it goes over everything, whatever the layer.`,
        code: `let player, tree;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(80, 150, 40, 40);
  player.color = 'deepskyblue';
  player.layer = 1;

  tree = new Sprite(260, 150, 70, 120);
  tree.collider = 'none';
  tree.color = 'forestgreen';
  tree.layer = 10;
}

function update() {
  player.vel.x = 0;
  if (kb.pressing('left')) player.vel.x = -3;
  if (kb.pressing('right')) player.vel.x = 3;
}

function draw() {
  background('#222');
  fill('white');
  textSize(24);
  textLayer(5); // over the player (layer 1), under the tree (layer 10)
  text('Welcome to the forest', 60, 160);
  textLayer();  // back to under every sprite
}`,
      },
      {
        title: 'Labels on sprites',
        body: `sprite.text puts a label directly on a sprite — a name tag, an HP counter, a damage number — without you tracking its x/y yourself. It's centered over the sprite and follows it automatically as the sprite moves, and it stays right-side-up even if the sprite rotates. Set it to null (the default) to remove the label.

sprite.textColor and sprite.textSize style it, same idea as fill()/textSize() for the global text() function but scoped to just this one sprite. It respects sprite.opacity too, so a fading sprite's label fades with it.

This is a different tool from the global text() function above: text() is for one-off draws you position yourself (titles, HUDs); sprite.text is for a label that's tied to a specific sprite.`,
        code: `let enemy;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  enemy = new Sprite(200, 200, 50, 50);
  enemy.color = 'firebrick';
  enemy.text = 'HP 3';
  enemy.textColor = 'white';
  enemy.textSize = 14;
}

function update() {
  if (kb.presses(' ')) enemy.text = 'HP 2';
}

function draw() {
  background('#222');
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
        body: `moSHion provides three functions for storing data in the browser's localStorage.

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
      {
        title: 'Saving to your account: save() and load()',
        body: `storeItem() keeps a value in this browser only. Open your game on another computer and the high score is gone. save() and load() do the same job, and they can also keep the value in your shCode account instead.

save(name, value) saves a value under a name, and load(name) reads it back (null when nothing is saved yet). On their own they work exactly like storeItem() and getItem(), in this browser.

Add 'remote' at the end and the value is kept in your account: save('best', score, 'remote') and load('best', 'remote'). Sign in on any computer, run the same game, and it is still there. 'local' means this browser, and it is what you get when you leave the word out.

Remote saves belong to one sketch: a lesson keeps its own, the Sandbox keeps its own, and a game from the Library keeps each player's saves in that player's own account. You must be signed in. If you are not, or the internet drops, the save stays in this browser and the console says so once, so the game keeps running.

To keep several values together, use saved(name, defaults). It gives back an object with your saved fields laid over the defaults. Change its fields, then call .save() to save the whole object: saved('player', { best: 0, coins: 0 }, 'remote') remembers 'remote', so player.save() goes to your account too.

A remote save can hold up to 100 names, 16 KB for one value and 64 KB in total, which is plenty for scores, levels and settings. Never save a password: anyone who can see your code can read it.`,
        code: `let player;
let score = 0;

function setup() {
  new Canvas(400, 400);
  // Saved in your account, so it follows you to any computer.
  player = saved('player', { best: 0, plays: 0 }, 'remote');
  player.plays += 1;
  player.save();
}

function update() {
  if (kb.presses(' ')) {
    score++;
    if (score > player.best) {
      player.best = score;
      player.save();
    }
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(18);
  text('Score: ' + score, 14, 30);
  fill('gold');
  text('Best: ' + player.best, 14, 54);
  fill('#888');
  textSize(12);
  text('Plays: ' + player.plays + '   space = score', 14, 76);
}`,
      },
    ],
  },
  {
    slug: 'multiplayer',
    title: 'Multiplayer',
    pages: [
      {
        title: 'One line: multiplayer()',
        body: `multiplayer(mode, players) turns a one-player sketch into a game for 2 to 4 people. Call it once, in setup(). The mode is one of four words:

'none' is one player, the same as not calling it at all.

'local' is 2 to 4 players taking turns at ONE keyboard.

'versus' is 2 to 4 players online, each on their own computer, taking turns against each other.

'coop' is 2 to 4 players online on the SAME side, with no turns: anyone can act at any time.

The second number is how many players, from 2 to 4 (2 if you leave it out). A mode it does not know, or a number outside 2 to 4, prints a message in the console and plays as one player.

After the call your sketch has a few new names: players (how many), turn (whose turn it is, counting from 0), nextTurn() (pass the turn to the next player), myTurn() (is it my turn right now?) and, online, seat (which player YOU are, 0 for the player who hosted). There is also game, with game.mode, game.players and game.ready, for showing what is going on. If your sketch already has its own turn or nextTurn, multiplayer() leaves yours alone and says so in the console.`,
        code: `function setup() {
  new Canvas(400, 200);
  multiplayer('local', 2);
}

function draw() {
  background('#1b1d2a');
  if (kb.presses('space')) nextTurn();
}

function drawTop() {
  text(game.mode + ' game for ' + players + ' players', 10, 30, 16, 'white');
  text('Player ' + (turn + 1) + ': press SPACE to pass the turn', 10, 60, 16, 'gold');
}`,
      },
      {
        title: 'Taking turns at one keyboard (local)',
        body: `In a 'local' game everyone shares the keyboard, so myTurn() is always true and whoever is at the keys plays for whoever's turn it is. Your code does the move and then calls nextTurn().

The example is race to 21: players take turns adding 1 or 2, and whoever makes the count reach 21 wins. Press 1 or 2. turn says whose turn it is; turn + 1 turns 0 and 1 into Player 1 and Player 2 for the screen.`,
        code: `let count = 0;
let winner = -1;

function setup() {
  new Canvas(400, 200);
  multiplayer('local', 2);
}

function draw() {
  background('#1b1d2a');
  if (winner === -1) {
    if (kb.presses('1')) add(1);
    if (kb.presses('2')) add(2);
  }
}

function add(n) {
  count = min(count + n, 21);
  if (count === 21) winner = turn;
  else nextTurn();
}

function drawTop() {
  text('Count: ' + count, 10, 40, 24, 'white');
  if (winner === -1) text('Player ' + (turn + 1) + ': press 1 or 2', 10, 80, 16, 'gold');
  else text('Player ' + (winner + 1) + ' reached 21 and wins!', 10, 80, 16, 'gold');
}`,
      },
      {
        title: 'Playing a classmate online (versus)',
        body: `Change one word, 'local' to 'versus', and the same game is played by two computers. A bar appears above the game with three ways in: Host makes a room and shows its code as four pictures (like coin, bee, key, apple); Join lets a classmate click those four pictures in order; and Open rooms lists rooms your classmates are hosting for THIS game, so they can just press Join. The bar shows how many are here ("1 of 2 here") until the room is full.

Two rules keep both screens the same:

Send, then apply. On your turn you do not change count yourself: you send your move with online.send({ add: 1 }). Every move, yours too, comes back to every computer through online.onMove, in the same order, and THAT is where count changes and nextTurn() is called. Both computers run the same moves in the same order, so they always agree.

Only the right player. myTurn() is true only when the room is full and it is your seat's turn. In onMove, check that the move came from the player whose turn it is (who === turn) and that it makes sense (1 or 2), and ignore it otherwise: then a wrong or broken move changes nothing anywhere.

Rooms are for classmates only (someone who shares a class with you), and you must be signed in. To try it alone, open the same page in a second browser tab: each tab is a different player.`,
        code: `let count = 0;
let winner = -1;

function setup() {
  new Canvas(400, 200);
  multiplayer('versus', 2);
  online.onMove((move, who) => {
    if (winner !== -1 || who !== turn) return;
    if (move.add !== 1 && move.add !== 2) return;
    count = min(count + move.add, 21);
    if (count === 21) winner = turn;
    else nextTurn();
  });
}

function draw() {
  background('#1b1d2a');
  if (winner === -1 && myTurn()) {
    if (kb.presses('1')) online.send({ add: 1 });
    if (kb.presses('2')) online.send({ add: 2 });
  }
}

function drawTop() {
  text('Count: ' + count, 10, 40, 24, 'white');
  if (!game.ready) text('Waiting for players: use the bar above', 10, 80, 14, '#8393c4');
  else if (winner !== -1) text('Player ' + (winner + 1) + ' wins!', 10, 80, 16, 'gold');
  else if (myTurn()) text('Your turn: press 1 or 2', 10, 80, 16, 'gold');
  else text('Player ' + (turn + 1) + ' is thinking...', 10, 80, 16, '#8393c4');
}`,
      },
      {
        title: 'Playing on the same side (coop)',
        body: `In a 'coop' game there are no turns: everyone is on the same team and can act whenever they like. myTurn() is true for everyone once the room is full. Moves still travel the same way, send then apply in onMove, so every computer sees the team's moves in one order.

The example is a shared tank for up to 4 players. Each press of SPACE sends one pump; every pump from anyone fills the tank, and the team wins when it is full. seat tells each computer which player it is, so the screen can say "You are player 3".`,
        code: `let water = 0;

function setup() {
  new Canvas(400, 200);
  multiplayer('coop', 4);
  online.onMove((move, who) => {
    if (move.pump === 1 && water < 100) water = min(water + 5, 100);
  });
}

function draw() {
  background('#1b1d2a');
  if (myTurn() && water < 100 && kb.presses('space')) online.send({ pump: 1 });
  fill('#333');
  rect(20, 100, 360, 40);
  fill('dodgerblue');
  rect(20, 100, 360 * water / 100, 40);
}

function drawTop() {
  if (!game.ready) text('Waiting for the team: use the bar above', 10, 40, 14, '#8393c4');
  else text('You are player ' + (seat + 1) + ' of ' + players + '. SPACE pumps!', 10, 40, 14, 'gold');
  if (water === 100) text('Full! The team did it.', 10, 80, 18, 'limegreen');
}`,
      },
      {
        title: 'What online play is good for',
        body: `Moves travel through the shCode server, which each computer checks about once a second (faster while everyone is in the room). Each player can send at most 30 moves every 10 seconds. That is plenty for turn-based and slower games: board games, card games, battles where each side picks an action, puzzles you solve together. It is NOT fast enough for real-time action where two players steer ships around the screen at the same moment, so do not send a move every frame: send one when something happens. (For a game where players move at the same time, see Real-time play, next.)

A move is game data only: numbers, true or false, and short one-word labels (no spaces, at most 24 letters of words in one move). A sentence is refused on purpose, because a game room is not a chat.

If the player who hosted runs their game again, the room closes and everyone else sees that it closed: one player hosts a new room and the others join it. A player who runs again with the room still open gets their seat back and catches up on every move.`,
        code: `// Send a move when something HAPPENS (a key press), never every frame.
let jumps = 0;

function setup() {
  new Canvas(400, 160);
  multiplayer('coop', 2);
  online.onMove((move, who) => {
    if (move.jump === true) jumps += 1;
  });
}

function draw() {
  background('#1b1d2a');
  if (myTurn() && kb.presses('space')) online.send({ jump: true });
}

function drawTop() {
  text('Jumps by the team: ' + jumps, 10, 40, 18, 'white');
  text('One move per press, not one per frame.', 10, 80, 14, '#8393c4');
}`,
      },
      {
        title: 'Real-time play',
        body: `Add a third piece to multiplayer() and the room becomes a real-time room: multiplayer('coop', 2, { realtime: true }). The lobby bar is the same (Host, Join, the four pictures, Open rooms), but moves now arrive in a few hundredths of a second instead of about once a second, and you get one new call:

online.share(sprite) shows this sprite on every other computer. About 15 times a second your computer sends where the sprite is (x, y, rotation), its size and its colour. On the other computers a copy appears by itself and glides smoothly between those updates, so it does not jump. Only YOUR computer moves your sprite; the copies just follow it. Call it once, in setup(), after multiplayer().

The copies of other players' sprites are in online.peers: online.peers[1] is the sprite player 2 (seat 1) shares, ready to draw or test. A copy has collider 'none', so it never pushes anything: ask overlaps() if you want to know when you touch it.

In the example each player steers their own square with the arrow keys and sees the other square glide around. Try it alone with a second browser tab.

What real time does NOT do, honestly:

No physics is shared. Each computer runs its own physics; a shared sprite is a position, not a body. If two players bump, each screen works it out on its own and they can disagree.

The owner decides. When something is hit, the computer that owns the thing that was hit decides what happened, and sends a move to say so (online.send). Everyone else believes that move.

Lag is real. A copy is drawn about a tenth of a second behind, so it can glide smoothly. Over a slow network it can be further behind.

The limits are the same as before: game data only in a move (numbers, true or false, short one-word labels), and at most 30 messages a second from each computer, sharing included. A sprite that has not moved is only sent once a second.`,
        code: `let me;

function setup() {
  new Canvas(400, 300);
  multiplayer('coop', 2, { realtime: true });
  me = new Sprite(200, 150, 40, 40);
  me.color = 'gold';
  online.share(me);
}

function draw() {
  background('#1b1d2a');
  me.vel.x = 0;
  me.vel.y = 0;
  if (kb.pressing('left')) me.vel.x = -4;
  if (kb.pressing('right')) me.vel.x = 4;
  if (kb.pressing('up')) me.vel.y = -4;
  if (kb.pressing('down')) me.vel.y = 4;
  me.x = constrain(me.x, 20, 380);
  me.y = constrain(me.y, 20, 280);
  if (seat === 1) me.color = 'deepskyblue';
}

function drawTop() {
  if (!game.ready) text('Waiting for a player: use the bar above', 10, 24, 14, '#8393c4');
  else {
    text('You are player ' + (seat + 1) + '.', 10, 24, 14, 'white');
    text('Arrow keys move your square.', 10, 44, 14, 'white');
  }
  let other = online.peers[seat === 0 ? 1 : 0];
  if (other && me.overlaps(other)) text('Touching!', 10, 68, 16, 'limegreen');
}`,
      },
      {
        title: 'Real-time play: the host decides',
        body: `Many online games work like a Minecraft server: one computer, the HOST, runs the real game, and everyone else sends what they are pressing and watches. Nobody can disagree, because there is only one world.

online.isHost is true on the host's computer (the player who pressed Host, seat 0) and false everywhere else.

Every player, the host too, sends their arrow keys as a move, but only when they CHANGE (pressing or letting go), never every frame: online.send({ dx: 1, dy: 0 }).

Only the host listens to those moves. In online.onMove it remembers each seat's keys; every frame it moves the real sprites by those keys; and it shares every sprite with online.share(), so every screen shows the host's world.

The others make no sprites of their own. The host's shared sprites appear on their screens by themselves; online.sharedBy(0) lists them, in the order the host shared them.

Because the host decides everything, a collision, a score or a win only happens on the host's computer. To show it on everyone's screen, share a sprite that shows it, or send a move about it.`,
        code: `let boxes = [];
let keys = [];
let sentKeys = '';

function setup() {
  new Canvas(400, 300);
  multiplayer('coop', 2, { realtime: true });
  online.onMove((move, who) => {
    if (online.isHost) keys[who] = move;
  });
}

function draw() {
  background('#1b1d2a');
  if (!game.ready) return;
  // Everyone: send my keys when they change.
  let dx = 0;
  let dy = 0;
  if (kb.pressing('left')) dx = -1;
  if (kb.pressing('right')) dx = 1;
  if (kb.pressing('up')) dy = -1;
  if (kb.pressing('down')) dy = 1;
  if (dx + ',' + dy !== sentKeys) {
    sentKeys = dx + ',' + dy;
    online.send({ dx: dx, dy: dy });
  }
  // The host: make the real sprites once, then move them by everyone's keys.
  if (online.isHost) {
    if (boxes.length === 0) {
      for (let i = 0; i < players; i++) {
        let box = new Sprite(100 + i * 200, 150, 40, 40);
        box.color = i === 0 ? 'gold' : 'deepskyblue';
        boxes.push(box);
        online.share(box);
      }
    }
    for (let i = 0; i < boxes.length; i++) {
      let k = keys[i] || { dx: 0, dy: 0 };
      boxes[i].vel.x = k.dx * 4;
      boxes[i].vel.y = k.dy * 4;
      boxes[i].x = constrain(boxes[i].x, 20, 380);
      boxes[i].y = constrain(boxes[i].y, 20, 280);
    }
  }
}

function drawTop() {
  if (!game.ready) text('Waiting for a player: use the bar above', 10, 24, 14, '#8393c4');
  else if (online.isHost) {
    text('You are the host:', 10, 24, 14, 'gold');
    text('your computer runs the game.', 10, 44, 14, 'gold');
  } else {
    text('The host runs the game.', 10, 24, 14, 'white');
    text('Your keys go to the host.', 10, 44, 14, 'white');
  }
}`,
      },
    ],
  },
  {
    slug: 'sharing',
    title: 'Sharing and changes',
    pages: [
      {
        title: 'Versions: saving with a note',
        body: `Publish game saves your sketch as a game in your Library. Every time you press Update game after that, it asks "What did you change?" and saves a new version with your answer as its note: "Added a second level", "Fixed the jump".

Your game's History lists every version with its note, who made it and when. See the changes shows exactly which lines changed: red lines are gone, green lines are new. Go back to this version puts an old version's code back as a NEW version, so nothing is ever lost, and you can go back from going back.

Write notes that say what changed, not "update" or "stuff". In a month, "Coins give 5 points now" tells you something; "changes" does not.

On GitHub, saving a version with a note is called a commit, the note is the commit message, and the list is the commit history.`,
      },
      {
        title: 'Remix: your own copy',
        body: `Remix on a classmate's game copies its code into your own sandbox. Change anything: it is your copy, and the original does not change. When you publish it, it says "Remixed from" the original, with its maker's name.

Your sandbox remembers which game and which version you started from. That is what lets you send your change back (Propose change) and bring in the maker's newer versions later.

A game shared as "Just play" has no Remix. A game shared as "keep remixes open" asks that your remix is shared the same way.

On GitHub, your own copy of someone else's project is called a fork.`,
      },
      {
        title: 'Proposing a change',
        body: `Made something better in your remix: a fixed bug, a new level, a nicer jump? Send it back. In the sandbox press Propose change, say what you changed in a few words, and (if you like) why. Press See my changes first to check exactly what you are sending.

The maker sees it in their Library under Proposed changes. They can look at the changes, press Try it to play the game with your change in, and then Accept it or say No thanks. If they accept, it becomes a new version of their game with your name on it, and the game's page says "With changes by" you.

Every proposed change has a conversation. The maker, you, and any classmate who can see the game can comment: ask a question, say what you tried, suggest something. It stays open after the change is accepted or not, until the maker or a teacher closes it. Your teacher can read every conversation. Talk about the game and the code, and be kind.

To change your proposal, edit the code in your sandbox and press Propose change again: it updates the one you sent. Take it back takes it away.

On GitHub this is called a pull request, and accepting one is called merging.`,
      },
      {
        title: 'Bring in the newest version',
        body: `While you work on your remix, the maker might change their game too. When they do, Propose change shows a dot, and the panel says the game has a newer version. Bring in the newest version puts their new lines into your code and keeps yours. Your code from before goes to the sandbox's History first, so nothing is lost.

If you and the maker changed the SAME lines, the two changes cannot be put together by themselves. You pick: keep your code for now, or start from the newest version and copy your change back in by hand (your code is in History). See both shows the two side by side.

Bring in the newest version before you propose, so the maker can accept your change without a clash.

On GitHub this is called syncing your fork, and two changes to the same lines is a merge conflict.`,
      },
      {
        title: 'How this matches GitHub',
        body: `Everything here is a small version of how programmers work together on GitHub:

Update game with a note is a commit. History is the commit history. Go back to this version is a revert.

Remix is a fork. Bring in the newest version is syncing your fork.

Propose change is a pull request. Its conversation is the pull request's conversation. See the changes is "Files changed". Try it is checking out the branch and testing it. Accept is merge, and No thanks is closing it.

Two changes to the same lines is a merge conflict. On GitHub you fix it by editing the lines yourself; here you keep one version and copy your change back in.`,
      },
    ],
  },
  {
    slug: 'patterns',
    title: 'Game Patterns',
    pages: [
      {
        title: 'Top-down movement',
        body: `For top-down games, keep world.gravity.y at 0 (where it starts) so nothing falls. Writing world.gravity.y = 0 in setup() anyway makes that choice plain to a reader. Move the player by writing to vel.x and vel.y based on the arrow keys.

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
        title: 'Timers: every and after',
        body: `every(frames, fn) calls a function every so many frames, and after(frames, fn) calls it once, that many frames from now. At 60 frames a second, every(60, spawn) runs spawn about once a second.

They count frames, not seconds, so they stay in step with frameCount: every(60, spawn) made in setup() fires on exactly the frames where frameCount % 60 === 0 is true. They pause when the sketch stops with noLoop().

Both give back a timer you can keep in a variable and stop() later: const t = every(30, blink); ... t.stop(); timer.active tells you whether it is still going (an after() timer stops being active once it has fired).`,
        code: `let pipes;
let spawner;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;
  pipes = new Group();
  pipes.color = 'limegreen';
  pipes.collider = 'none';

  spawner = every(45, () => {
    const p = new pipes.Sprite(420, 40 + Math.random() * 220, 30, 80);
    p.vel.x = -3;
  });

  after(600, () => {
    spawner.stop();
  });
}

function update() {
  pipes.cull(60);
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text(spawner.active ? 'spawning' : 'stopped', 14, 20);
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
