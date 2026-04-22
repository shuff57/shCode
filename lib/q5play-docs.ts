// In-app q5play reference. Original content derived from the public API
// surface in public/q5play/docs/q5play.d.ts — not scraped from the Learn site.

export interface DocPage {
  title: string;
  body: string;
  code?: string;
}

export interface DocSection {
  slug: string;
  title: string;
  pages: DocPage[];
}

export const sections: DocSection[] = [
  {
    slug: 'overview',
    title: 'Overview',
    pages: [
      {
        title: 'What is q5play?',
        body: `q5play is a beginner-friendly web game engine. It pairs q5.js (a small p5-style drawing library) with Box2D physics, so you can draw shapes and make them bump into each other without wiring the two worlds together yourself.

It's aimed at people who've written a little JavaScript and want to make a game this afternoon — not a week from now. The whole API is a handful of globals: Sprite, Group, world, camera, kb, mouse.

You don't import anything. You don't install anything. You write three functions — setup, update, and draw — and the engine runs them for you.`,
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
        body: `A q5play sketch runs three functions on a loop. setup() runs once at the start — you make your canvas and your sprites there. update() runs every frame before physics steps — you read input and change velocities here. draw() runs every frame after physics — you clear the screen and draw any extras here.

update() runs before physics on purpose. When you set player.vel.x in update(), the next physics step uses that new velocity. If you set it in draw(), physics has already moved the sprite for this frame.

By default the loop runs 60 times per second. frameCount tells you how many frames have passed since the sketch started — handy for timing things without a clock.`,
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
        body: `q5play runs in "global mode." That means Canvas, Sprite, world, kb, and friends are already on the page — you just use them. No import, no new Engine(), no setup boilerplate.

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

On high-DPI screens q5 automatically renders at retina resolution, so your text and shapes stay crisp. The default background is a soft gray — you'll usually replace it by calling background() inside draw.`,
        code: `function setup() {
  new Canvas(400, 400);
}

function draw() {
  background('#202030');
  fill('deepskyblue');
  noStroke();
  circle(200, 200, 120);
}`,
      },
      {
        title: 'frameCount and frameRate',
        body: `frameCount is a global number that starts at 0 and goes up by 1 every frame. It's the simplest way to animate: use it to offset a position, wrap a counter with %, or trigger something every N frames.

frameRate() with no argument returns the measured frames-per-second, which is useful for debugging performance. frameRate(n) asks the browser to target n frames per second — 30, 60, or whatever you pick. Most sketches leave this alone and run at 60.

Combine frameCount with Math.sin or Math.cos to get smooth back-and-forth motion without any physics.`,
        code: `let ball;

function setup() {
  new Canvas(400, 400);
  frameRate(60);
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

A solid color takes a name ('black', 'tomato'), a hex string ('#222', '#ff00aa'), or rgb/rgba values. For a see-through background use rgba(0, 0, 0, 0.1) — only 10% opaque, so old frames fade out gradually instead of vanishing.

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
  fill(0, 0, 0, 25);
  noStroke();
  rect(0, 0, 400, 400);
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
        body: `A Sprite is the basic building block of any q5play game. Every sprite has a position, a size, and (usually) a physics body that moves and collides automatically.

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

'static' never moves and never reacts. Use it for floors, walls, and platforms. 'kinematic' moves only when you set its velocity — gravity ignores it. Use it for moving platforms and doors. 'none' turns physics off entirely — the sprite still draws, but nothing collides with it. Use it for cursors, UI, and decorations.`,
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

.rotation is in radians. Math.PI/2 is a quarter turn (90 degrees), Math.PI is a half turn (180 degrees), Math.PI*2 is a full turn.

.scale uniformly grows or shrinks how the sprite is drawn. The physics body stays the size you created it at, so very large scale values can look strange when the sprite collides.`,
        code: `let box, spinner;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  box = new Sprite(120, 200, 40, 60);
  box.rotation = Math.PI / 6;

  spinner = new Sprite(280, 200, 40, 40);
  spinner.collider = 'none';
  spinner.color = 'gold';
}

function update() {
  spinner.rotation += 0.05;
  spinner.scale = 1 + 0.3 * Math.sin(frameCount / 20);
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Color, visibility, and layer',
        body: `.color sets the fill. You can use CSS names ('red'), hex ('#ff8800'), or rgb strings.

.stroke is the outline color and .strokeWeight is its thickness in pixels. Set strokeWeight to 0 for no outline.

.visible = false hides a sprite without removing it — physics still runs. .opacity (0 to 1) fades it instead. .layer controls draw order — higher layer values draw on top.`,
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

  const ghost = new Sprite(300, 120, 40, 40);
  ghost.opacity = 0.4;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Shape options',
        body: `A third numeric argument makes a circle: new Sprite(x, y, diameter). Two size arguments make a rectangle: new Sprite(x, y, w, h).

For custom outlines, pass an array of absolute [x, y] vertex points instead of x and y. If the first and last point are the same, you get a closed polygon (good for platforms with slopes). If they're different, you get an open chain (good for terrain).

The engine chooses the collider shape from these arguments — you don't set a .shape property directly.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  new Sprite(90, 120, 40, 60);

  const ball = new Sprite(200, 120, 40);
  ball.color = 'tomato';

  new Sprite([
    [20, 340],
    [120, 300],
    [220, 360],
    [380, 320]
  ], 'static');
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Removing and cleaning up sprites',
        body: `sprite.delete() removes a sprite from the world. After deleting, it stops drawing, stops updating, and its physics body is gone. There is no undo — if you only want to hide a sprite, set .visible = false instead.

You can check sprite.removed to see whether a sprite has already been deleted. Deleting an already-deleted sprite is harmless but wastes work.

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
        title: 'Pass through contacts',
        body: `Sometimes you want two sprites to detect each other without physically stopping each other — like a player passing through a one-way platform, or a ghost drifting through walls. sprite.passes(other) sets up a pass-through contact relationship between this sprite and a target sprite or group. From then on, their colliders slide through each other instead of bumping.

This is different from colliding() and overlapping(). colliding(target) returns how many frames the sprite has been physically hitting the target — useful when sprites solidly block each other. overlapping(target) returns how many frames two sprites have been intersecting through sensors — useful for trigger zones where no push happens.

pass() is an alias for passes(). You only need to call it once (typically in setup) — the relationship stays in place until you delete one of the sprites.`,
        code: `let player, ghostWall, solidWall;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  player = new Sprite(60, 200, 30, 30);
  player.color = 'deepskyblue';
  player.vel.x = 2;

  ghostWall = new Sprite(200, 200, 20, 160, 'static');
  ghostWall.color = 'plum';
  solidWall = new Sprite(320, 200, 20, 160, 'static');

  player.passes(ghostWall);
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Advanced movement helpers',
        body: `Beyond setting velocity directly, sprites have helpers that do the math for you. sprite.moveTowards(x, y, tracking) moves a sprite a fraction of the way toward a point each frame — tracking is 0 to 1, where 0.1 means "close 10% of the gap this frame". It's perfect for homing enemies or smooth camera-like follow behavior.

sprite.rotateTowards(target, tracking) turns the sprite toward an angle or a position the same way. Pair it with sprite.angleTo(other) to get the raw angle between two sprites, or read sprite.bearing to see the direction the sprite is currently pointing.

sprite.attractTo(target, force) applies a gravitational-style pull toward a point each frame — great for magnets or tractor beams. Because it adds force instead of setting velocity, it stacks naturally with the physics engine.`,
        code: `let hunter, target;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  target = new Sprite(320, 320, 20, 20);
  target.color = 'gold';

  hunter = new Sprite(60, 60, 24, 24);
  hunter.color = 'tomato';
}

function update() {
  hunter.moveTowards(target, 0.04);
  hunter.rotateTowards(target, 0.2);
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Chain colliders',
        body: `A chain sprite is a thin, open line built from a list of points — think ropes, wires, or the jagged edge of a hillside. You create one by passing an array of [x, y] points whose first and last points are different, so the shape stays open.

Chains only collide on one side, so dynamic sprites can land on terrain without snagging. They're usually static, because you rarely want a piece of terrain to move.

Each point is an absolute canvas position, not an offset from the sprite's center. Keep the points in order from one end of the chain to the other.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  new Sprite([
    [20, 260],
    [120, 300],
    [220, 240],
    [320, 320],
    [380, 280]
  ], 'static');

  const ball = new Sprite(80, 40, 24);
  ball.color = 'gold';
  ball.bounciness = 0.6;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Polygon colliders',
        body: `A polygon sprite has a custom closed shape made from a list of points. Unlike a chain, the first and last points are the same — that closing loop tells q5play the shape is solid, not an open line.

Polygons are great for slopes, ramps, arrowheads, and any non-rectangular solid. Keep the points in order around the outline, and keep the shape convex (no dents) — that's what the physics engine handles cleanly.

Like chains, the points are absolute canvas coordinates. The physics body and the drawn outline both come from these points; you don't need to set width or height.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  new Sprite([
    [40, 360],
    [200, 200],
    [360, 360],
    [40, 360]
  ], 'static');

  const box = new Sprite(160, 60, 30, 30);
  box.color = 'tomato';
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Adding colliders',
        body: `A sprite can have more than one collider on its physics body. sprite.addCollider(offsetX, offsetY, w, h) tacks on an extra rectangular collider at an offset from the sprite's center — useful for L-shapes, crosses, hammers, or any compound object that isn't a simple box.

The offset is measured from the sprite's center, so (0, 0) sits right on top of the original collider. The new collider rotates and moves with the sprite automatically.

Adding a collider recalculates the sprite's mass but leaves its center of mass alone by default, which keeps handling predictable while you're building up a shape.`,
        code: `let hammer;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  hammer = new Sprite(200, 120, 12, 80);
  hammer.color = 'tan';
  hammer.addCollider(0, -50, 60, 20);

  new Sprite(200, 380, 400, 20, 'static');
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Adding sensors',
        body: `Sensors are like colliders that don't push. sprite.addSensor(offsetX, offsetY, w, h) attaches a trigger zone to the sprite — other sprites pass right through, but your code can still detect the overlap with overlaps() or overlapping().

Use sensors for things like "aggro range" around an enemy, pickup radius around a coin, or detection cones on a guard. They move and rotate with the sprite just like colliders do.

If you call an overlap detection function on a sprite that has no sensors, q5play calls sprite.addDefaultSensors() for you — it creates sensors the same size as each collider. You can call it manually if you want that behavior without waiting for the first overlap check.`,
        code: `let guard, player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  guard = new Sprite(200, 200, 30, 30);
  guard.color = 'gray';
  guard.addSensor(0, 0, 160, 160);

  player = new Sprite(60, 200, 24, 24);
  player.color = 'deepskyblue';
  player.vel.x = 1;
}

function draw() {
  background('#222');
  if (guard.overlapping(player)) guard.color = 'tomato';
  else guard.color = 'gray';
}`,
      },
      {
        title: 'Custom update per sprite',
        body: `Every sprite has an update function that q5play calls right before each physics step. By default it does nothing, but you can replace it with your own logic: sprite.update = function() { ... }. Inside that function, this refers to the sprite, so you can read this.x, set this.vel.y, or check input.

This is handy when different sprites need different per-frame behavior and you don't want one giant global update() switch statement. Each enemy, bullet, or door can own the logic that belongs to it.

The global update() function still runs too — think of sprite.update as a place for that single sprite's logic, and the top-level update() as the place for orchestration between sprites.`,
        code: `let floater;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  floater = new Sprite(200, 200, 30, 30);
  floater.color = 'gold';
  floater.startY = 200;

  floater.update = function() {
    this.y = this.startY + Math.sin(frameCount / 20) * 40;
  };
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Custom draw per sprite',
        body: `Every sprite also has a draw function, called after the physics step to render it on the canvas. You can override it the same way: sprite.draw = function() { ... }. Inside, (0, 0) is the center of the sprite and the canvas is already translated and rotated for you — so you just draw shapes relative to the middle.

This is the cleanest way to add decorations like eyes on a character, a glowing halo, or a health bar above a monster, without creating a whole separate sprite just for the decoration.

Your custom draw replaces the default shape entirely, so if you still want the base body drawn, either redraw it yourself or call the original function you saved first.`,
        code: `let bot;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  bot = new Sprite(200, 200, 60, 60);
  bot.color = 'slateblue';

  bot.draw = function() {
    fill('slateblue');
    rect(-30, -30, 60, 60);
    fill('white');
    circle(-12, -8, 10);
    circle(12, -8, 10);
  };
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Awaiting animation sequences',
        body: `Some sprite methods return Promises so you can sequence sprite actions with async/await instead of juggling frame counters. The main ones are animation methods: sprite.playAni('name') resolves when the animation finishes playing, and sprite.playAnis('a', 'b', 'c') resolves after the whole sequence completes.

Inside an async function you can await those calls one after another, and the code reads top-to-bottom like a storyboard. This is much easier than setting flags like isOpening and checking them every frame.

Remember that async code keeps running while the rest of the sketch continues — the physics world does not pause. Treat awaited steps as scheduled events, not as a freeze.`,
        code: `let door;

async function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  door = new Sprite(200, 200, 60, 80);
  door.color = 'sienna';

  await door.addAni('opening', '/sprites/door.png', 6);
  await door.playAni('opening');
  door.color = 'gold';
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

Each sprite has a .vel vector with .x and .y components, measured in pixels per second. Reading .vel tells you how fast a sprite is moving; writing it overrides physics for that frame.

Assigning vel every frame is fine for player controls — you're telling the engine exactly what you want. But it fights physics for projectiles and bouncy objects; for those, use forces (see later page).`,
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
        title: 'Mass and density',
        body: `.mass is how heavy a sprite is. Heavy sprites push light ones around and resist being pushed themselves. By default the engine computes mass from the sprite's size and density.

.density is mass per unit area — a material property. Wood is low density, lead is high. Two same-sized sprites with different densities will have very different masses.

You usually set density and let the engine handle mass, but you can override .mass directly when you need exact values.`,
        code: `let heavy, light;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');

  heavy = new Sprite(120, 100, 60, 60);
  heavy.density = 10;
  heavy.color = 'slategray';

  light = new Sprite(260, 100, 60, 60);
  light.density = 0.3;
  light.color = 'wheat';
}

function update() {
  if (kb.pressing('right')) {
    heavy.applyForce({ x: 200, y: 0 });
    light.applyForce({ x: 200, y: 0 });
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

These are per-sprite properties, but when two sprites touch, Box2D combines their values. Bounciness uses the higher of the two, friction uses a geometric mean — so one bouncy wall makes the contact bouncy, and one icy floor makes the contact slippery.`,
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
        title: 'Drag and damping',
        body: `.drag slows a sprite's linear motion over time, like air resistance. 0 means no drag (motion lasts forever in space); higher values stop sprites faster.

.rotationDrag does the same thing for spin. A sprite with rotationDrag = 0 spins forever once kicked; higher values settle rotation to a stop.

If you don't want to use drag directly, you can apply a counter-force each frame proportional to .vel — but drag is usually simpler and more stable.`,
        code: `let puck;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  puck = new Sprite(200, 200, 40, 40);
  puck.drag = 1;
  puck.rotationDrag = 2;
  puck.color = 'deepskyblue';
}

function update() {
  if (kb.presses(' ')) {
    puck.vel.x = 8;
    puck.rotationSpeed = 0.1;
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('Press space to launch', 14, 24);
}`,
      },
      {
        title: 'Forces, torque, and rotation',
        body: `.applyForce(amount) pushes a sprite. Pass a number to push in the sprite's current bearing, or an object like { x, y } to push in a specific direction. Call it every frame for continuous thrust, or once for a shove.

.applyTorque(amount) is the rotation version — positive spins clockwise, negative counter-clockwise. Use it for spinning fans, rotating enemies, or realistic tumbling.

For direct control of spin, set .rotationSpeed (radians per frame) like you'd set .vel. Forces and torque respect mass, so heavy sprites react less to the same push than light ones do.`,
        code: `let rocket;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');

  rocket = new Sprite(200, 300, 20, 60);
  rocket.color = 'tomato';
  rocket.drag = 0.5;
  rocket.rotationDrag = 2;
}

function update() {
  if (kb.pressing('up'))    rocket.applyForce({ x: 0, y: -40 });
  if (kb.pressing('left'))  rocket.applyTorque(-2);
  if (kb.pressing('right')) rocket.applyTorque(2);

  if (kb.presses(' ')) rocket.applyForce({ x: 0, y: -200 });
}

function draw() {
  background('#222');
}`,
      },
    ],
  },
  {
    slug: 'world',
    title: 'World',
    pages: [
      {
        title: 'World settings',
        body: `world is the physics simulation. The two knobs you'll touch most are world.gravity and world.timeScale.

world.gravity.y is how hard dynamic sprites fall. 10 feels earth-like in q5play units. Set it to 0 for a top-down game where nothing should drift downward. world.gravity.x does the same sideways — useful for wind or a tilted world.

world.timeScale slows down or speeds up physics without changing your frame rate. 1.0 is normal, 0.5 is bullet-time, 2.0 is fast-forward. Your update() still runs 60 times a second, but sprites move half as far per step at 0.5.

One q5play "unit" is one pixel by default. A 60-pixel sprite is roughly 1 meter in the simulation, which is why default gravity of 10 looks right.`,
        code: `let ball;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  ball = new Sprite(200, 80, 30);
  ball.bounciness = 0.6;
  new Sprite(200, 380, 400, 20, 'static');
}

function update() {
  if (kb.presses('s')) world.timeScale = 0.25;
  if (kb.presses('n')) world.timeScale = 1;
  if (kb.presses('f')) world.timeScale = 2;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('s=slow  n=normal  f=fast', 10, 20);
}`,
      },
      {
        title: 'Contact callbacks',
        body: `Instead of checking collisions in an if statement, you can hand collides() and overlaps() a callback function. The engine calls it on the first frame two sprites touch, and passes the two sprites as arguments.

collides fires when sprites physically push each other. collided fires on the frame they stop touching. overlaps and overlapped work the same way but for sensor-style passthrough contact (sprites with .collider = 'none').

Callbacks are handy when one sprite touches many targets — a bullet hitting any enemy in a Group, say. Put the call in update(), pass the Group as the target, and let the callback handle each pair.`,
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
        title: 'Sleeping sprites',
        body: `Idle sprites are expensive to simulate for no reason. q5play fixes this by letting sprites "sleep" — they sit frozen in place and skip the physics step until something touches them again. It's on by default and you rarely need to think about it.

world.allowSleeping flips the feature on or off globally. Turn it off only while debugging weird stuck-sprite bugs, then turn it back on. You can also check sprite.sleeping on a single sprite to see if it dozed off, or set it to false to force it awake.

A pile of stacked crates that isn't being touched will sleep within a second or two, and your frame rate stays high even with hundreds of them on screen.`,
        code: `let awake = 0;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');
  for (let i = 0; i < 20; i++) {
    new Sprite(100 + i * 10, 50 + i * 15, 22, 22);
  }
}

function update() {
  awake = 0;
  for (let s of allSprites) if (!s.sleeping) awake++;
  if (kb.presses('space')) {
    for (let s of allSprites) s.sleeping = false;
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('awake: ' + awake + '   space=wake all', 10, 20);
}`,
      },
      {
        title: 'Controlling time',
        body: `world.timeScale stretches or squashes simulated time. 1 is normal, 0.3 is dreamy slow-mo, 2 is frantic. Your draw() and update() still run at 60 fps — only the physics step size changes.

world.physicsUpdate(step) lets you advance the simulation manually. Pair it with world.autoStep = false for a turn-based game, or call it multiple times per frame to catch up after a pause.

world.realTime is wall-clock seconds since setup. world.physicsTime is seconds inside the simulation, which drifts away from realTime whenever you change timeScale or pause. Compare them to show a "bullet time" clock.`,
        code: `let ball;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  ball = new Sprite(200, 60, 24);
  ball.bounciness = 0.7;
  new Sprite(200, 380, 400, 20, 'static');
}

function update() {
  if (kb.pressing('shift')) world.timeScale = 0.2;
  else world.timeScale = 1;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('hold shift for slow-mo', 10, 20);
  text('real: ' + world.realTime.toFixed(1), 10, 40);
  text('sim:  ' + world.physicsTime.toFixed(1), 10, 58);
}`,
      },
      {
        title: 'Performance testing',
        body: `Set world.renderStats = true and q5play draws a tiny overlay with sprite counts and timings in the top-left of the canvas. It's the fastest way to spot a scene that's getting too heavy.

For a custom HUD, frameRate() returns the current frames-per-second. Read it in draw() and render it with text(). If it dips below 60 you're spending too long in update() or drawing too many sprites.

As a rule: fewer sprites + smaller canvas + images instead of shape-fills = faster. Your browser's performance tab will show you exactly which line is slow when you really need to dig in.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  world.renderStats = true;
  new Sprite(200, 380, 400, 20, 'static');
  for (let i = 0; i < 60; i++) {
    new Sprite(random(50, 350), random(0, 200), 14, 14);
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('fps: ' + floor(frameRate()), 10, 380);
}`,
      },
      {
        title: 'Finding sprites at a point',
        body: `world.getSpriteAt(x, y) returns the top-most sprite that overlaps that point, or undefined if nothing is there. world.getSpritesAt(x, y) returns every overlapping sprite, ordered by layer. Both require the sprite to have a physics body, which any default Sprite has.

This is the pattern you want for click-to-select in a level editor, tower-defense placement, or any "tap a unit" menu. Read mouse.x and mouse.y in update() and hand them straight to getSpriteAt.

Pass a radius argument if you want a little slop around the cursor — useful on touch screens where a finger tip isn't precise.`,
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
    selected = world.getSpriteAt(mouse.x, mouse.y, 4);
    if (selected) selected.color = 'tomato';
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Ray casting',
        body: `A ray cast is a line fired from a point in some direction, asking "what's the first thing I hit?". world.rayCast(startPos, direction, maxDistance) returns the first sprite the ray touches, or undefined. direction is an angle in degrees; startPos is any {x, y}.

Use it for line-of-sight checks — can the enemy see the player? Aim a ray from the enemy at the player and see what comes back. If it's the player, fire. If it's a wall, hold position.

world.rayCastAll returns every sprite the ray crosses, sorted by distance. Handy for piercing bullets or laser sights that need to know about every target on the line.`,
        code: `let enemy, player, wall, seen = false;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  enemy = new Sprite(60, 200, 26, 26);
  enemy.color = 'crimson';
  wall = new Sprite(220, 200, 20, 120, 'static');
  player = new Sprite(360, 200, 26, 26);
  player.color = 'gold';
}

function update() {
  if (kb.pressing('up')) player.y -= 3;
  if (kb.pressing('down')) player.y += 3;
  let angle = atan2(player.y - enemy.y, player.x - enemy.x);
  let hit = world.rayCast(enemy, angle, 500);
  seen = hit === player;
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text(seen ? 'SPOTTED' : 'hidden', 10, 24);
}`,
      },
      {
        title: 'Meter size',
        body: `Box2D, the physics engine under q5play, is tuned for objects between 0.1 and 10 meters wide. world.meterSize is how many pixels equal one meter, and it defaults to 60. That's why a 60 px ball feels like a soccer ball under the default gravity of 10.

If your game uses tiny sprites (say 10 px bullets and 20 px enemies), bump meterSize down to about 20. If you're making a game with huge 300 px characters, raise it to 120 or so. Sprites outside the 0.1–10 meter band simulate badly — they tunnel through walls or drift weirdly.

Changing meterSize changes how gravity feels without touching world.gravity.y. Smaller meters make the same gravity number look faster and punchier.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.meterSize = 30;
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');
  for (let i = 0; i < 8; i++) {
    let s = new Sprite(80 + i * 30, 40, 14, 14);
    s.bounciness = 0.5;
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('meterSize = ' + world.meterSize, 10, 22);
}`,
      },
      {
        title: 'Explosions',
        body: `world.explodeAt(x, y, radius, magnitude, falloff) shoves every sprite inside the radius away from the center point. Sprites farther from the blast get pushed less, controlled by falloff (default 0.1 means 10% weaker per pixel).

magnitude is the base strength — 1 is a gentle nudge, 20 launches crates across the screen. Because the force is applied as an impulse, heavier sprites move less, which looks right.

Trigger it on a click, a timer, a collision between a rocket and anything — whatever makes sense. Static sprites ignore the force, so walls stay put while everything else flies.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');
  for (let i = 0; i < 18; i++) {
    new Sprite(random(60, 340), random(60, 300), 20, 20);
  }
}

function update() {
  if (mouse.presses()) {
    world.explodeAt(mouse.x, mouse.y, 160, 8, 0.05);
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('click to explode', 10, 22);
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
  zone.opacity = 0.5;
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
        title: 'Collision callbacks',
        body: `sprite.collides(other) returns true on the first frame of contact. sprite.colliding(other) returns a truthy frame count while contact continues. sprite.overlaps(other) and sprite.overlapping(other) are the overlap versions.

You can pass a callback as a second argument, which runs once when the event happens. This is cleaner than if-statements when you want to react to a specific pairing.

Two common patterns: use colliding(ground) before a jump to confirm the player is standing on something, and use overlaps(coin, callback) to collect pickups.`,
        code: `let player, ground, coin;
let score = 0;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  player = new Sprite(200, 100, 30, 30);
  player.color = 'deepskyblue';

  ground = new Sprite(200, 380, 400, 20, 'static');

  coin = new Sprite(280, 340, 20);
  coin.collider = 'none';
  coin.color = 'gold';
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;

  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -8;
  }

  player.overlaps(coin, () => {
    score++;
    coin.delete();
  });
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('Score: ' + score, 14, 24);
}`,
      },
      {
        title: 'Collisions with groups',
        body: `The collision functions work against a single sprite or a whole Group. player.colliding(enemies) is true whenever the player touches any sprite in the enemies group.

If you need to know which sprite was hit, iterate the group yourself and test one-by-one. That also lets you filter — for example, only enemies that haven't already been defeated.

When you delete sprites in response to a hit, loop over [...group] (a copy) so the shrinking group doesn't skip items.`,
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

Create a group with new Group(). Then spawn sprites into it with new groupName.Sprite(...) — note the capital S. That factory reads the group's color, diameter, collider, and other defaults.

Common defaults to set right after creating a group: color, diameter (for circles) or width/height, collider ('none' is useful for pickups and decorations), and layer.`,
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

group.remove(sprite) pulls the sprite out of the group but leaves it in the world. sprite.delete() deletes the sprite entirely.`,
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
        title: 'Filtering and searching',
        body: `Because Groups are Arrays, .filter and .find work out of the box. Use them to pull out sprites that match a condition without writing your own loop.

.filter returns a new plain array (not a Group) of every matching sprite. .find returns the first match, or undefined.

A common pattern is locating the nearest enemy to the player: compute a squared distance for each enemy, then pick the smallest. Squared distance is faster than Math.sqrt and works fine for comparisons.`,
        code: `let player, enemies, target;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 20);
  player.color = 'white';

  enemies = new Group();
  enemies.color = 'tomato';
  enemies.diameter = 18;
  enemies.collider = 'none';
  for (let i = 0; i < 8; i++) {
    new enemies.Sprite(Math.random() * 400, Math.random() * 400);
  }
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -3;
  else if (kb.pressing('right')) player.vel.x = 3;
  if (kb.pressing('up'))         player.vel.y = -3;
  else if (kb.pressing('down'))  player.vel.y = 3;

  target = null;
  let best = Infinity;
  for (const e of enemies) {
    const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
    if (d < best) { best = d; target = e; }
  }
  for (const e of enemies) e.color = 'tomato';
  if (target) target.color = 'yellow';
}

function draw() {
  background('#112');
}`,
      },
      {
        title: 'Arrow function property setters',
        body: `Group properties accept a function instead of a fixed value. When a sprite spawns into the group, q5play calls that function with the new sprite's index (its position in the group's array) and assigns the return value to that sprite.

This is the easiest way to vary a property across members. Set enemies.color to an arrow function and every enemy picks its own color the moment it spawns, based on where it lands in the group.

The function runs once per sprite, at spawn time. It's not a live binding — changing the function later won't retroactively repaint existing sprites.`,
        code: `let enemies;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  enemies = new Group();
  enemies.diameter = 24;
  enemies.collider = 'none';
  enemies.color = (i) => i % 2 ? 'red' : 'blue';

  for (let i = 0; i < 6; i++) {
    new enemies.Sprite(60 + i * 50, 200);
  }
}

function draw() {
  background('#112');
}`,
      },
      {
        title: 'Indexed arrow setters',
        body: `The index passed to an arrow setter is a regular number, so you can do math with it. That turns a single property assignment into a whole spawn pattern.

enemies.x = (i) => 50 + i * 40 staggers sprites across a row. Combine it with a y setter that uses Math.floor(i / cols) to fill a grid. No loop body needed — just set the defaults and spawn.

This also lets you keep spawn code short. A ten-line for-loop becomes three lines of group setup plus enemies.amount = 20.`,
        code: `let grid;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  grid = new Group();
  grid.diameter = 24;
  grid.collider = 'none';
  grid.color = (i) => i % 3 ? 'teal' : 'orange';
  grid.x = (i) => 60 + (i % 6) * 50;
  grid.y = (i) => 60 + Math.floor(i / 6) * 50;

  grid.amount = 24;
}

function draw() {
  background('#112');
}`,
      },
      {
        title: 'Tiles',
        body: `group.addTiles(textPattern) builds a whole level from an ASCII map. Each character in the string matches a group whose .tile property equals that character, and a sprite from that group gets spawned at the corresponding cell.

Set group.tile on each group first, then call walls.addTiles(map) on any one of them — it walks the whole map and routes each character to the right group. Spaces are skipped.

The column width and row height default to the first tile's width and height, so give your tile groups a diameter or width/height before calling addTiles.`,
        code: `let walls, coins;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  walls = new Group();
  walls.tile = '#';
  walls.color = 'gray';
  walls.w = 24;
  walls.h = 24;

  coins = new Group();
  coins.tile = '*';
  coins.color = 'gold';
  coins.diameter = 14;
  coins.collider = 'none';

  walls.addTiles([
    '##########',
    '#  *   * #',
    '#   ##   #',
    '# *    * #',
    '##########',
  ]);
}

function draw() {
  background('#112');
}`,
      },
      {
        title: 'Custom properties',
        body: `You aren't limited to q5play's built-in properties. Assign any property you like on a group and it becomes a default for every sprite spawned afterward — enemies.hp = 3 gives every new enemy an hp of 3.

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
      {
        title: 'Sub groups',
        body: `Pass a parent group to new Group(parent) and you get a subgroup whose sprites automatically belong to both the subgroup and the parent. Inheritance flows both ways: the subgroup reads defaults from its parent, and any sprite spawned into the subgroup also shows up in the parent's array.

That means player.overlaps(enemies) picks up everything — the plain enemies and any subgroup members like flyers or walkers — without you wiring each subgroup up by hand.

Subgroups can have their own subgroups, so you can build a small hierarchy: enemies → flyers → bossFlyers. Each level inherits from the one above and feeds into it on spawn.`,
        code: `let player, enemies, flyers;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 20);
  player.color = 'white';

  enemies = new Group();
  enemies.collider = 'none';
  enemies.diameter = 20;

  flyers = new Group(enemies);
  flyers.color = 'violet';

  new enemies.Sprite(80, 80);
  new flyers.Sprite(320, 80);
  new flyers.Sprite(320, 320);
}

function update() {
  if (player.overlaps(enemies)) player.color = 'yellow';
  else player.color = 'white';
}

function draw() {
  background('#112');
}`,
      },
      {
        title: 'The allSprites group',
        body: `allSprites is a built-in Group that every sprite joins automatically the moment it's created. You never construct it — it's already there as soon as q5play loads.

It's useful whenever you want to touch "every sprite in the scene" at once: allSprites.length for a live count, allSprites.debug = true to see every collider outline, or for (const s of allSprites) to iterate the whole world.

Since it extends Array like any other Group, the same patterns apply. A few settings are exclusive to it though — autoCull in particular only does something on allSprites.`,
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
        title: 'Culling',
        body: `Sprites that drift off-camera still sit in memory and keep updating. Culling deletes them once they're far enough away. allSprites.autoCull is on by default and removes any sprite more than 10,000 pixels from the camera — a safety net against infinite spawners. Set allSprites.autoCull = false to turn that off.

For tighter control, call group.cull(top, bottom, left, right) each frame to delete sprites past those margins around the camera. The margins are in pixels and each argument is optional.

Pass a callback as the last argument and it runs for each culled sprite instead of deleting — handy for recycling bullets or respawning enemies off-screen.`,
        code: `let bullets;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  bullets = new Group();
  bullets.color = 'yellow';
  bullets.diameter = 6;
  bullets.collider = 'none';
}

function update() {
  if (frameCount % 4 === 0) {
    let b = new bullets.Sprite(0, 200);
    b.vel.x = 5;
  }
  bullets.cull(50, 50, 50, 50);
}

function draw() {
  background('#112');
  fill('white');
  textSize(14);
  text('alive: ' + bullets.length, 14, 22);
}`,
      },
      {
        title: 'Group lifecycle: life, draw, update',
        body: `group.life sets a countdown on every new sprite in the group. Each physics step subtracts world.timeScale from it, and when it reaches zero the sprite is deleted. Setting projectiles.life = 120 gives every bullet roughly two seconds at 60fps — no manual cleanup needed.

group.autoDraw and group.autoUpdate let you opt a whole group out of the per-frame draw or update pass. Set decor.autoDraw = false and q5play stops drawing those sprites automatically, leaving you to draw them yourself in draw(). Same idea for autoUpdate when you want to pause physics for a group.

These three flags are the main knobs for controlling when a group acts. life handles time-to-live, autoUpdate pauses logic, autoDraw pauses rendering.`,
        code: `let sparks;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  sparks = new Group();
  sparks.color = 'yellow';
  sparks.diameter = 6;
  sparks.collider = 'none';
  sparks.life = 60;
}

function update() {
  let s = new sparks.Sprite(200, 200);
  s.vel.x = Math.random() * 4 - 2;
  s.vel.y = Math.random() * 4 - 2;
}

function draw() {
  background('#112');
  fill('white');
  textSize(14);
  text('sparks: ' + sparks.length, 14, 22);
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
      {
        title: 'Zoom',
        body: `camera.zoom scales the view. 1 is normal, 2 doubles the apparent size of everything, 0.5 halves it. Set it directly, or tween it toward a target.

Zooming keeps camera.x and camera.y at the center of the screen. To zoom toward a specific world point, move the camera to that point while changing zoom.

Press Z or X in the sample below to zoom in or out. Clamp the zoom value so you can't flip it negative.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  for (let i = 0; i < 30; i++) {
    const s = new Sprite(Math.random() * 800 - 200, Math.random() * 800 - 200, 20);
    s.color = 'mediumpurple';
    s.collider = 'none';
  }
  player = new Sprite(200, 200, 24);
  player.color = 'gold';
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -4;
  else if (kb.pressing('right')) player.vel.x = 4;
  if (kb.pressing('up'))         player.vel.y = -4;
  else if (kb.pressing('down'))  player.vel.y = 4;

  camera.x = player.x;
  camera.y = player.y;

  if (kb.pressing('z')) camera.zoom += 0.02;
  if (kb.pressing('x')) camera.zoom -= 0.02;
  if (camera.zoom < 0.3) camera.zoom = 0.3;
}

function draw() {
  background('#112');
}`,
      },
      {
        title: 'Screen space vs world space',
        body: `Sprites live in world coordinates. The camera decides which window of the world lands on the canvas. Two sprites at the same world position are always at the same world.x and world.y, even as the camera scrolls.

mouse.x and mouse.y are also in world coordinates — they already account for the camera. That means you can point a sprite at the mouse without any math, even while scrolling.

For HUD elements that should stay pinned to the screen, call camera.off() before drawing them and camera.on() after. While the camera is off, coordinates map directly to canvas pixels.`,
        code: `let player, reticle;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  new Sprite(1000, 380, 2000, 20, 'static');
  player = new Sprite(200, 300, 30);
  player.color = 'deepskyblue';
  reticle = new Sprite(0, 0, 10);
  reticle.color = 'tomato';
  reticle.collider = 'none';
}

function update() {
  if (kb.pressing('left'))       player.vel.x = -5;
  else if (kb.pressing('right')) player.vel.x = 5;
  camera.x = player.x;

  reticle.x = mouse.x;
  reticle.y = mouse.y;
}

function draw() {
  background('#222');
  camera.off();
  fill('white');
  textSize(14);
  text('HUD pinned to screen', 14, 22);
  camera.on();
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

kb.pressing('key') returns the number of frames the key has been held — truthy while down. Use it for continuous actions like walking.

kb.presses('key') is true only on the first frame of a press. Use it for single-shot actions like jumping or firing. kb.released('key') is true only on the frame the key is let go.

Key names are lowercase strings: 'left', 'right', 'up', 'down', 'a', 'w', 'enter', and ' ' (a single space) for the space bar.`,
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
  if (kb.released(' '))  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Multi-key movement',
        body: `To read two keys at once, just check both with kb.pressing. Diagonal movement works naturally when you set vel.x and vel.y independently.

There's a catch: moving diagonally at full speed on both axes is actually faster than moving straight (about 1.41× faster). To keep speed constant, normalize — divide both components by the vector length when both are non-zero.

q5play exposes modifier keys too: kb.shift, kb.control, kb.alt, and kb.meta. They're numeric frame counters, truthy while held. Use them to build sprinting, precision aiming, or shortcut combos.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 30);
  player.color = 'deepskyblue';
}

function update() {
  let dx = 0, dy = 0;
  if (kb.pressing('left'))  dx -= 1;
  if (kb.pressing('right')) dx += 1;
  if (kb.pressing('up'))    dy -= 1;
  if (kb.pressing('down'))  dy += 1;

  const len = Math.hypot(dx, dy);
  if (len > 0) { dx /= len; dy /= len; }

  const speed = kb.shift ? 8 : 4;
  player.vel.x = dx * speed;
  player.vel.y = dy * speed;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Mouse position and buttons',
        body: `mouse.x and mouse.y are the cursor's position in world coordinates (already camera-aware).

mouse.pressing(), mouse.presses(), and mouse.released() work like their keyboard cousins. With no argument they report the primary button. Pass 'left', 'right', or 'center' to target a specific one.

mouse.left, mouse.right, and mouse.center are also exposed as numeric frame counters — truthy while held, zero when not. Useful when you just want a boolean test.`,
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

  if (mouse.pressing('left'))       dot.color = 'gold';
  else if (mouse.pressing('right')) dot.color = 'tomato';
  else                              dot.color = 'white';
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('x: ' + Math.round(mouse.x) + '  y: ' + Math.round(mouse.y), 14, 22);
}`,
      },
      {
        title: 'Dragging and clicks',
        body: `mouse.drags('left') is true on the first frame the user moves the mouse with the left button held. mouse.dragging('left') is truthy for every frame of that drag. mouse.dragged('left') fires once when the button is released after a drag.

To drag a sprite, remember which sprite is held and keep updating it to follow. On mouse.presses(), find the sprite under the cursor; on mouse.pressing(), move it; on mouse.released(), drop it.

For a single-click action, prefer mouse.presses() — it fires once per click, no matter how long the button stays down.`,
        code: `let held = null;
let box;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  box = new Sprite(200, 200, 60, 60);
  box.color = 'deepskyblue';
  box.collider = 'none';
}

function update() {
  if (mouse.presses('left')) {
    if (mouse.x > box.x - 30 && mouse.x < box.x + 30 &&
        mouse.y > box.y - 30 && mouse.y < box.y + 30) {
      held = box;
    }
  }
  if (held && mouse.pressing('left')) {
    held.x = mouse.x;
    held.y = mouse.y;
  }
  if (mouse.released('left')) held = null;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Touch and pointer',
        body: `For single-touch games, the mouse object already works on mobile — taps become mouse presses, drags become mouse drags. Most sketches don't need anything more.

q5play also exposes a pointer object and a pointers array for multi-touch. pointer.x and pointer.y mirror the most recent touch or click in world coordinates. pointer.press is a frame counter that's truthy while the pointer is down.

pointer.overlaps(sprite) tells you when a touch has landed on a sprite — useful for draggable UI. pointer.grabs() and pointer.grabbing() work specifically with grabbable physics sprites.`,
        code: `let trail;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  trail = new Group();
  trail.color = 'gold';
  trail.diameter = 10;
  trail.collider = 'none';
}

function update() {
  if (pointer.press) {
    new trail.Sprite(pointer.x, pointer.y);
  }
}

function draw() {
  background('#112');
  fill('white');
  textSize(14);
  text('Tap or click to draw', 14, 22);
}`,
      },
      {
        title: 'Gamepad (Contro)',
        body: `contros is an array of connected controllers. contros[0] is the first player's gamepad. A controller has to receive at least one input before the browser reveals it, so press a button to wake it up.

Buttons are numeric frame counters: a, b, x, y, l, r, start, select, up, down, left, right. Truthy while held, zero when not. Use .presses('a') for single-shot actions.

Analog sticks live at leftStick and rightStick, each with x and y from -1 to 1. Dead-zone the sticks yourself — real hardware rarely reads perfect zero at rest.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;
  player = new Sprite(200, 200, 30);
  player.color = 'deepskyblue';
}

function update() {
  const gp = contros[0];
  if (gp && gp.connected) {
    let dx = gp.leftStick.x;
    let dy = gp.leftStick.y;
    if (Math.abs(dx) < 0.15) dx = 0;
    if (Math.abs(dy) < 0.15) dy = 0;
    player.vel.x = dx * 5;
    player.vel.y = dy * 5;
    if (gp.presses('a')) player.color = 'gold';
    if (gp.presses('b')) player.color = 'deepskyblue';
  }
}

function draw() {
  background('#222');
  if (!contros[0] || !contros[0].connected) {
    fill('white');
    textSize(14);
    text('Press a gamepad button to connect', 20, 200);
  }
}`,
      },
      {
        title: 'Grab sprites with the mouse',
        body: `Set sprite.grabbable = true and q5play lets the player click-and-drag that sprite with the mouse or a touch pointer. Under the hood q5play creates a GrabberJoint that pulls the sprite toward the pointer with a spring force, so it still respects gravity, mass, and collisions with other sprites.

You can also set group.grabbable = true to make every sprite in a group draggable at once. The pointer object exposes pointer.grabs(), pointer.grabbing(), and pointer.grabbed() so your code can react the frame grabbing starts, every frame it continues, and the frame it ends.

The sandbox below makes a box grabbable — click and drag it around the canvas. It'll swing from the mouse like it's on a rubber band.`,
        code: `let box, floor;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0.5;

  floor = new Sprite(200, 380, 400, 20, 'static');
  floor.color = 'gray';

  box = new Sprite(200, 200, 60, 60);
  box.color = 'tomato';
  box.grabbable = true;
}

function draw() {
  background('#222');
  if (mouse.grabs()) box.color = 'gold';
  if (mouse.grabbed()) box.color = 'tomato';
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
        body: `A GlueJoint welds two sprites together so they move and rotate as a single rigid body. Create it with new GlueJoint(spriteA, spriteB) after both sprites exist.

Like every joint, a GlueJoint can break if too much force is applied. Raise joint.forceThreshold and joint.torqueThreshold for sturdier bonds, or lower them for destructible contraptions.

Once glued, changing one sprite's position or velocity carries the other along. Gluing a dynamic sprite to a static one effectively pins it in place until the joint breaks.`,
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
        body: `A DistanceJoint keeps two sprites at a fixed distance — the basis for ropes, tethers, and pendulum strings. Set joint.length to change the target distance after creation.

Enable joint.limitsEnabled and set joint.range = [min, max] if you want the distance to flex between two values instead of staying exact.

For a springy tether, set joint.springiness above 0 and add joint.damping so the oscillation settles down.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  const anchor = new Sprite(200, 60, 16, 16, 'static');
  const ball = new Sprite(320, 60, 30);
  ball.color = 'tomato';

  const tether = new DistanceJoint(anchor, ball);
  tether.springiness = 0.2;
  tether.damping = 0.1;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'WheelJoint',
        body: `WheelJoint is built for vehicles. Pass the chassis as spriteA and the wheel as spriteB. The wheel can spin freely around its center and travels along a vertical axis, giving you free suspension.

Drive the wheel by setting its rotationSpeed each frame — the chassis will be pushed along via friction with the ground.

Tweak joint.springiness and joint.damping for softer or stiffer suspension.`,
        code: `let chassis, wheel;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');

  chassis = new Sprite(200, 300, 100, 20);
  wheel = new Sprite(180, 330, 26);
  wheel.friction = 1;
  new WheelJoint(chassis, wheel);
}

function update() {
  if (kb.pressing('right'))     wheel.rotationSpeed = 0.3;
  else if (kb.pressing('left')) wheel.rotationSpeed = -0.3;
  else                          wheel.rotationSpeed = 0;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'HingeJoint',
        body: `A HingeJoint pins two sprites at a shared point and lets them rotate around it. Use it for pendulums, swinging doors, ragdoll arms, and anything that needs to pivot.

By default the hinge uses the midpoint between the two sprites. Set joint.offsetA or joint.offsetB to move the pivot — for example, to the top of a rod so it swings from its end.

Enable joint.limitsEnabled and set joint.range = [minAngle, maxAngle] in radians to stop the rotation at specific angles — handy for a door that only swings one way.`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  const anchor = new Sprite(200, 80, 16, 16, 'static');
  const rod = new Sprite(200, 180, 16, 180);
  rod.color = 'khaki';

  const hinge = new HingeJoint(anchor, rod);
  hinge.offsetB = { x: 0, y: -90 };
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'SliderJoint',
        body: `A SliderJoint locks two sprites to a single axis of motion and forbids rotation between them. It's perfect for pistons, elevators, and sliding panels.

The axis is set by the line between the two sprites' centers when the joint is created. Place spriteA above spriteB for a vertical slider, side-by-side for a horizontal one.

Drive the moving sprite with .vel along the axis, or let physics push it. Up and down arrows in the sample below drive the piston.`,
        code: `let base, piston;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  base = new Sprite(200, 200, 20, 20, 'static');
  piston = new Sprite(200, 260, 80, 20);
  piston.color = 'orange';

  new SliderJoint(base, piston);
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
        title: 'GrabberJoint',
        body: `A GrabberJoint lets an input pointer pull a physics sprite toward a target position. It's how you drag boxes around in a physics puzzle.

The constructor takes a pointer object and the sprite to grab: new GrabberJoint(pointer, sprite). Update joint.target each frame to move the sprite where the pointer goes.

Delete the joint with joint.delete() when the pointer is released so the sprite falls back under normal physics.`,
        code: `let box, grab;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  new Sprite(200, 380, 400, 20, 'static');
  box = new Sprite(200, 300, 50, 50);
  box.color = 'deepskyblue';
  box.grabbable = true;
}

function update() {
  if (pointer.presses() && pointer.overlaps(box)) {
    grab = new GrabberJoint(pointer, box);
  }
  if (grab) {
    grab.target = { x: pointer.x, y: pointer.y };
  }
  if (pointer.released() && grab) {
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
  orb.rotation = frameCount / 20;
  orb.scale = 1 + 0.25 * Math.sin(frameCount / 15);
  orb.color = (frameCount % 60 < 30) ? 'cyan' : 'magenta';
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Ani (sprite-sheet frames)',
        body: `An Ani is a sequence of image frames. In a real project you build one from a sprite sheet with sprite.addAni('sheet.png', frameCount), which slices the sheet horizontally. ani.frameDelay controls how many draw cycles each frame is held for; ani.looping controls whether it repeats.

This sandbox is offline and cannot load image files, so the sample below builds an Ani by hand from two EmojiImage frames. In a real project you would call addAni with a URL to your own sprite sheet instead.

Once the sprite has an Ani set via sprite.ani, q5play draws and advances the frames for you every frame.`,
        code: `let sprite;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  const frameA = EmojiImage('\u{1F603}', 64);
  const frameB = EmojiImage('\u{1F62E}', 64);

  const ani = new Ani(frameA, frameB);
  ani.frameDelay = 20;
  ani.looping = true;

  sprite = new Sprite(200, 200, 64, 64);
  sprite.collider = 'none';
  sprite.ani = ani;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Anis (named animation sets)',
        body: `A sprite can hold many animations in sprite.anis, keyed by name. The usual way to build it is sprite.addAnis(url, 'WIDTHxHEIGHT', { idle: ..., run: ..., jump: ... }).

Switch which one is playing with sprite.changeAni('run'), or play once with sprite.playAni('jump'). You can prefix the name with '!' to play backwards, '>' or '<' to flip horizontally, and '^' to flip vertically.

The sandbox can't load sprite sheets, so the sample below attaches two hand-built Anis to the sprite and swaps between them based on keyboard input.`,
        code: `let hero;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  const idleA = EmojiImage('\u{1F642}', 64);
  const idleB = EmojiImage('\u{1F60A}', 64);
  const runA = EmojiImage('\u{1F3C3}', 64);
  const runB = EmojiImage('\u{1F6B6}', 64);

  hero = new Sprite(200, 200, 64, 64);
  hero.collider = 'none';

  const idle = new Ani(idleA, idleB);
  idle.name = 'idle';
  idle.frameDelay = 30;
  const run = new Ani(runA, runB);
  run.name = 'run';
  run.frameDelay = 10;

  hero.anis.idle = idle;
  hero.anis.run = run;
  hero.changeAni('idle');
}

function update() {
  if (kb.pressing('right')) {
    hero.x += 2;
    hero.changeAni('run');
  } else {
    hero.changeAni('idle');
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Groups with animations',
        body: `A Group holds sprites that share traits, and it can also hold a whole library of animations. When you call group.addAni('walk', frames) or group.addAnis('sheet.png', '32x32', {...}), every sprite in the group inherits those animations automatically.

That means you can spawn ten enemies into the same Group, and each one can call sprite.changeAni('walk') or sprite.changeAni('attack') without loading frames again. New members added later inherit too.

The sandbox below builds two hand-made Anis, attaches them to a Group's anis collection, and spawns three sprites that all share the same animations — each one can switch independently.`,
        code: `let enemies;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  const idleA = EmojiImage('\u{1F47E}', 48);
  const idleB = EmojiImage('\u{1F47D}', 48);
  const zapA = EmojiImage('⚡', 48);
  const zapB = EmojiImage('✨', 48);

  enemies = new Group();
  enemies.anis.idle = new Ani(idleA, idleB);
  enemies.anis.zap = new Ani(zapA, zapB);
  enemies.anis.idle.frameDelay = 20;
  enemies.anis.zap.frameDelay = 6;

  for (let i = 0; i < 3; i++) {
    const e = new enemies.Sprite(100 + i * 100, 200, 48, 48);
    e.collider = 'none';
    e.changeAni(i === 1 ? 'zap' : 'idle');
  }
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Cut frames',
        body: `By default q5play draws animation frames by rendering a region of the sprite sheet directly. That is fast, but rotating or scaling a sprite can cause pixels from neighboring frames to bleed in at the edges.

Setting anis.cutFrames = true tells q5play to slice each frame out as its own image up front. It uses a bit more memory and takes slightly longer to load, but rotated and scaled sprites stay clean. You can also nudge where frames draw with ani.offset = { x, y } when a sheet is not perfectly centered.

The sandbox can't fetch a sprite sheet, so the sample below shows the pattern you'd use: enable cutFrames on the anis collection, then add animations from a URL with a frame size.`,
        code: `let hero;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  hero = new Sprite(200, 200, 64, 64);
  hero.collider = 'none';
  hero.anis.cutFrames = true;
  hero.anis.offset = { x: 0, y: -4 };

  // In a real project with a sheet on disk:
  // await hero.addAnis('hero.png', '32x32', {
  //   idle: { row: 0, frames: 4 },
  //   run:  { row: 1, frames: 6 },
  // });

  hero.img = EmojiImage('\u{1F9D9}', 64);
}

function update() {
  hero.rotation += 1;
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Animation sequencing',
        body: `sprite.playAni(name) returns a Promise that resolves when the animation finishes its last frame. That makes it trivial to write cutscenes or chained moves with async/await — the code reads top-to-bottom even though each step takes many frames.

You can also call sprite.playAnis('windup', 'slash', 'recover') to run a sequence in order, or await sprite.changeAni('attack') when you want the non-looping ani to complete before moving on.

The sandbox example waits on a two-frame "wave" to finish, then switches back to idle. In a real game this is how you'd block input during a finishing move or gate a door behind a boss's death animation.`,
        code: `let hero;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  const idle = new Ani(EmojiImage('\u{1F642}', 64), EmojiImage('\u{1F60A}', 64));
  const wave = new Ani(EmojiImage('\u{1F44B}', 64), EmojiImage('✋', 64));
  idle.name = 'idle';
  wave.name = 'wave';
  wave.looping = false;
  wave.frameDelay = 30;

  hero = new Sprite(200, 200, 64, 64);
  hero.collider = 'none';
  hero.anis.idle = idle;
  hero.anis.wave = wave;
  hero.changeAni('idle');

  runCutscene();
}

async function runCutscene() {
  await hero.playAni('wave');
  hero.changeAni('idle');
}

function draw() {
  background('#222');
}`,
      },
      {
        title: 'Visuals (no physics)',
        body: `Sprite is the physics-aware drawable, but q5play also ships a plain Visual class — the same drawing features (img, ani, anis, position) without a Box2D body. Visuals are perfect for HUD icons, floating damage numbers, decorative particles, or anything that shouldn't collide.

A Visuals collection works like a Group for Visuals. You can cull offscreen ones with visuals.cull(...), assign shared animations with visuals.addAni, and draw them all with visuals.draw().

The sandbox below mixes a physics sprite with a floating HUD visual. The visual ignores gravity and colliders entirely — it's just an image positioned wherever you like.`,
        code: `let player, coinIcon;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0.5;

  player = new Sprite(200, 350, 40, 40);
  player.color = 'skyblue';

  coinIcon = new Visual();
  coinIcon.img = EmojiImage('\u{1FA99}', 32);
  coinIcon.x = 30;
  coinIcon.y = 30;
}

function draw() {
  background('#222');
  coinIcon.draw();
}`,
      },
    ],
  },
  {
    slug: 'images',
    title: 'Images & Assets',
    pages: [
      {
        title: 'Loading images',
        body: `In a normal q5play project you assign an image URL to a sprite and the engine loads it for you: sprite.img = 'player.png'. If the string has no dot in it, q5play treats it as an emoji and builds an EmojiImage instead.

This in-app sandbox is offline — it cannot reach the internet or your local file system. That means loadImage('https://...') and sprite.img = 'player.png' will fail here. When you run q5play in a real project, you'll serve images from the same folder as your sketch and those APIs work normally.

The runnable sample below uses EmojiImage, which needs no network. It's the same pattern you'd use for a real image: build or load an image, then assign it to sprite.img.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  player = new Sprite(200, 200, 64, 64);
  player.collider = 'none';
  player.img = EmojiImage('\u{1F984}', 64);
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
        title: 'Emoji images and texture atlases',
        body: `EmojiImage(emoji, textSize) returns a Q5.Image containing a rendered emoji at the given size. Assign it to sprite.img, or use it as a frame inside an Ani. It's the fastest way to get a visible character into a q5play sketch without loading assets.

parseTextureAtlas(xml) converts a Starling/Sparrow-style atlas XML into a lookup object keyed by sub-texture name. Each entry has x, y, width, and height — the pixel rectangle of that frame inside the sheet. Pass the result to sprite.addAnis to cut frames out of a packed sprite sheet by name.

Because this sandbox is offline, the sample below demonstrates only EmojiImage. In a real project you'd typically fetch the atlas XML, call parseTextureAtlas, then feed it to addAnis.`,
        code: `let hero, coin;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  hero = new Sprite(150, 200, 64, 64);
  hero.collider = 'none';
  hero.img = EmojiImage('\u{1F9D9}', 64);

  coin = new Sprite(260, 200, 48, 48);
  coin.collider = 'none';
  coin.img = EmojiImage('\u{1FA99}', 48);
}

function update() {
  coin.rotation = frameCount / 20;
}

function draw() {
  background('#222');
}`,
      },
    ],
  },
  {
    slug: 'drawing',
    title: 'Drawing',
    pages: [
      {
        title: 'Shapes and primitives',
        body: `For anything that isn't a sprite — health bars, score backgrounds, aim lines — you draw shapes directly. Call them from draw() after background().

rect(x, y, w, h) draws a rectangle with its top-left at (x, y). circle(x, y, diameter) draws a circle centered on (x, y). line(x1, y1, x2, y2) draws a line between two points. triangle(x1, y1, x2, y2, x3, y3) draws a triangle.

fill(color) sets the interior color for shapes that come after it. stroke(color) sets the outline color; noStroke() turns the outline off. strokeWeight(px) sets how thick the outline is.

Settings stick until you change them. Set fill once, draw five circles, and they'll all be that color.`,
        code: `function setup() {
  new Canvas(400, 400);
}

function draw() {
  background('#112');

  noStroke();
  fill('tomato');
  rect(40, 40, 120, 60);

  fill('deepskyblue');
  circle(260, 80, 80);

  stroke('white');
  strokeWeight(3);
  fill('gold');
  triangle(100, 300, 180, 180, 260, 300);

  stroke('#888');
  strokeWeight(1);
  line(20, 360, 380, 360);
}`,
      },
      {
        title: 'Colors and palettes',
        body: `Anywhere a color is expected, q5play takes several formats. Named CSS colors like 'tomato', 'deepskyblue', 'gold' work. Hex strings '#RRGGBB' or the short '#RGB' work. rgb(r, g, b) and rgba(r, g, b, a) work — alpha is 0 (invisible) to 1 (solid).

color(...) makes a reusable color object you can store in a variable and pass around. This is faster than parsing a string every frame.

q5play also carries a palette system used by its pixel-art helper: world.palettes is an array of letter-to-color maps. Palettes are mainly useful when you define sprites by character, but you can read colors from them anywhere in a sketch.`,
        code: `let sky, grass;

function setup() {
  new Canvas(400, 400);
  sky = color('#87ceeb');
  grass = color(80, 180, 90);
}

function draw() {
  background(sky);

  noStroke();
  fill(grass);
  rect(0, 280, 400, 120);

  fill('#ffd54a');
  circle(320, 80, 60);

  fill('rgba(255, 255, 255, 0.8)');
  circle(90, 100, 40);
  circle(140, 90, 50);
  circle(180, 110, 36);
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

textFont('Courier New') switches fonts. Any font the browser has works; monospace fonts like 'Courier New' or 'monospace' look good for scores and debug readouts.

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
  textAlign('center');
  text('q5play', 200, 80);

  fill('gold');
  textSize(18);
  textAlign('left');
  text('Score: ' + score, 20, 140);

  fill('#888');
  textSize(12);
  text('press space to score', 20, 160);
}`,
      },
      {
        title: "HUDs that don't scroll",
        body: `When you move camera.x to follow the player, everything drawn inside draw() scrolls with the world — including your score text. That's rarely what you want for a HUD.

The fix is camera.off(). While the camera is off, drawing uses raw screen coordinates: (0, 0) is the top-left of the canvas no matter where the camera is. Call camera.off(), draw your HUD, then camera.on() to return to world drawing.

Put your HUD drawing at the end of draw() so it sits on top of the game. The pattern is always the same: background, game shapes, camera.off(), HUD, camera.on().`,
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

  camera.off();
  fill('white');
  textSize(16);
  text('x: ' + Math.round(player.x), 10, 24);
  fill('gold');
  rect(10, 34, 120, 6);
  camera.on();
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

Draw the HUD in draw() after background() so it sits on top. Use fixed x/y coordinates — not world coordinates — so the HUD stays put if the camera scrolls.`,
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
  return sections.find((s) => s.slug === slug);
}

export function getAllSectionSlugs(): string[] {
  return sections.map((s) => s.slug);
}
