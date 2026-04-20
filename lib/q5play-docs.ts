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
        body: `q5play is a beginner-friendly web game engine. It uses q5.js for rendering and Box2D for physics.

Every sketch has three optional functions: setup() runs once when the sketch starts, update() runs every frame before physics steps, and draw() runs every frame after physics.

You rarely call these yourself — the engine calls them for you. Your job is to create sprites in setup(), react to input in update(), and clear the background in draw().`,
        code: `function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
}

function update() {
  // input, spawning, game logic
}

function draw() {
  background('#222');
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
        body: `A Sprite is the basic building block of any q5play game. It has a position, a size, a shape, and (usually) a physics body.

new Sprite(x, y, width, height) creates a rectangular dynamic sprite. "Dynamic" means it's affected by gravity and collisions.

Store the sprite in a variable outside setup() so update() and draw() can reference it.`,
        code: `let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}`,
      },
      {
        title: 'Physics types: dynamic, static, kinematic',
        body: `Sprites have four collider types:

• dynamic (default) — affected by gravity, pushes and is pushed by other sprites
• static — never moves; use for floors, walls, platforms
• kinematic — moves only when you set its velocity; ignored by gravity
• none — no physics at all; useful for UI or decorative sprites

Pass the type as the last argument to new Sprite().`,
        code: `// A classic platformer scene
let player = new Sprite(200, 100, 40, 40);                    // dynamic
let ground = new Sprite(200, 380, 400, 20, 'static');         // static
let platform = new Sprite(100, 260, 80, 10, 'static');        // static
let elevator = new Sprite(320, 200, 60, 10, 'kinematic');
elevator.vel.y = 1;`,
      },
      {
        title: 'Position, size, and shape',
        body: `.x and .y are the center of the sprite (not the top-left corner).

A single size argument makes a circle: new Sprite(x, y, diameter). Two size arguments make a rectangle.

.rotation is in radians. Math.PI/4 is 45°, Math.PI/2 is 90°, Math.PI is 180°.

.scale uniformly scales the drawn sprite (not the physics body — that stays the size you created).`,
        code: `let ball = new Sprite(200, 100, 30);          // circle, diameter 30
let box = new Sprite(100, 200, 40, 60);       // 40×60 rectangle
box.rotation = Math.PI / 6;                    // tilted 30°
box.scale = 1.5;                               // visually 1.5× larger`,
      },
    ],
  },
  {
    slug: 'physics',
    title: 'Physics',
    pages: [
      {
        title: 'Gravity and velocity',
        body: `world.gravity.y controls how hard sprites fall. 10 is "earth-like" in q5play units. Set it to 0 for top-down games.

Each sprite has .vel.x and .vel.y — instantaneous velocity in pixels per second. Setting these directly overrides physics for that frame — useful for player control.

For platformer jumps, set vel.y to a negative number (remember y grows downward).`,
        code: `world.gravity.y = 10;

function update() {
  if (kb.pressing('left')) player.vel.x = -5;
  else if (kb.pressing('right')) player.vel.x = 5;

  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -8;  // jump
  }
}`,
      },
      {
        title: 'Bounciness and friction',
        body: `.bounciness (0 to 1+) is how much energy is preserved when sprites collide. 0 means they stick; 1 means perfectly elastic; above 1 adds energy (fun but unstable).

.friction (0+) is how much surfaces resist sliding. 0 means frictionless (icy floor); high values drag motion quickly.

These are properties of each sprite. When two sprites collide, Box2D combines their values.`,
        code: `let ball = new Sprite(200, 100, 30);
ball.bounciness = 0.9;   // bouncy
ball.friction = 0;        // no drag — keeps rolling

let floor = new Sprite(200, 380, 400, 20, 'static');
floor.friction = 0.3;     // some drag on the ground`,
      },
    ],
  },
  {
    slug: 'input',
    title: 'Input',
    pages: [
      {
        title: 'Keyboard',
        body: `The global kb object tracks keyboard state.

kb.pressing('key') returns true every frame the key is held down. Use this for continuous actions like movement.

kb.presses('key') returns true only on the frame the key was first pressed. Use this for single-shot actions like jumping or firing.

Key names are lowercase: 'left', 'right', 'up', 'down', 'a', 'b', 'w', ' ' (space).`,
        code: `function update() {
  // Continuous: move as long as the key is held
  if (kb.pressing('left'))  player.vel.x = -5;
  if (kb.pressing('right')) player.vel.x = 5;

  // Edge-triggered: fires once per tap
  if (kb.presses(' ')) shoot();
  if (kb.presses('r')) restart();
}`,
      },
      {
        title: 'Mouse',
        body: `The global mouse object tracks cursor state.

mouse.x and mouse.y are the cursor position within the canvas.

mouse.pressing() is true while a button is held; mouse.presses() fires once on click; mouse.releases() fires once on release.

mouse.drags() is like pressing but only after the cursor has moved with a button down — useful for drag-and-drop.`,
        code: `function update() {
  if (mouse.pressing()) {
    cursor.x = mouse.x;
    cursor.y = mouse.y;
  }
  if (mouse.presses()) {
    spawnProjectile(mouse.x, mouse.y);
  }
}`,
      },
    ],
  },
  {
    slug: 'groups',
    title: 'Groups',
    pages: [
      {
        title: 'Spawning and iterating',
        body: `A Group holds many sprites and acts as a factory for new ones. Setting a property on the group becomes the default for any sprite spawned into it.

Spawn a sprite into a group with new groupName.Sprite(...) — note the capital S. The sprite inherits the group's defaults.

Groups extend Array, so you can use .length, for..of, .filter, and .forEach on them. When removing sprites during iteration, iterate a copy: [...group].forEach(...).`,
        code: `let apples;

function setup() {
  new Canvas(400, 400);
  apples = new Group();
  apples.color = 'red';
  apples.diameter = 20;
  apples.collider = 'none';
}

function update() {
  if (frameCount % 30 === 0) {
    new apples.Sprite(Math.random() * 400, 0);
  }
  for (let a of [...apples]) {
    a.y += 2;
    if (a.y > 420) a.remove();
  }
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
        body: `There are two ways sprites interact: physical collision and logical overlap.

a.colliding(b) is true when sprites a and b are in physical contact this frame — they push each other. Used for ground-checks before jumping, wall-sensing, etc.

a.overlapping(b) is true when their bounding boxes intersect, but they pass through each other. Used for pickups, triggers, goal zones. You usually set .collider = 'none' on sprites you want to overlap rather than collide.

Both work against a single sprite or a whole Group.`,
        code: `// Ground check — physical collision
if (kb.presses(' ') && player.colliding(ground)) {
  player.vel.y = -8;
}

// Pickup — logical overlap (coin has collider = 'none')
for (let coin of [...coins]) {
  if (player.overlapping(coin)) {
    score++;
    coin.remove();
  }
}`,
      },
    ],
  },
  {
    slug: 'camera',
    title: 'Camera',
    pages: [
      {
        title: 'Scrolling the view',
        body: `The camera controls which part of the world is visible. camera.x and camera.y are the center of the viewport.

To make the world scroll with the player, set camera.x = player.x each frame. This works because q5play draws sprites relative to the camera.

For a softer "lag" effect, ease the camera toward the player: camera.x += (player.x - camera.x) * 0.1. The 0.1 is the catch-up speed (0 = never, 1 = instant).`,
        code: `// Build a wider-than-canvas level
let ground = new Sprite(1000, 390, 2000, 20, 'static');

function update() {
  // Follow with lag
  camera.x += (player.x - camera.x) * 0.1;
}`,
      },
    ],
  },
  {
    slug: 'joints',
    title: 'Joints',
    pages: [
      {
        title: 'DistanceJoint, HingeJoint, SliderJoint',
        body: `Joints constrain how two sprites move relative to each other.

DistanceJoint — keeps them at a fixed distance. Use for tethers, chains, ropes.

HingeJoint — pins them at a point, lets them rotate. Use for pendulums, doors, ragdolls.

SliderJoint — lets them only translate along an axis. Use for pistons, elevators, sliding panels.

Usually one sprite in a joint is static (an anchor) and the other is dynamic.`,
        code: `let anchor = new Sprite(200, 60, 16, 16, 'static');
let rod = new Sprite(200, 160, 20, 120);
new HingeJoint(anchor, rod);  // pendulum

let floor = new Sprite(400, 200, 16, 16, 'static');
let elevator = new Sprite(400, 300, 60, 20);
new SliderJoint(floor, elevator);  // vertical piston`,
      },
      {
        title: 'WheelJoint and GrabberJoint',
        body: `WheelJoint is a specialized joint for vehicles. It lets a wheel rotate freely around the chassis and suspend vertically. You can drive the wheel by setting its angularVelocity.

GrabberJoint is controlled by input — typically it lets the mouse grab and drag a sprite. Great for physics-based puzzles.

See the car and slingshot challenges (5.2.3 and 5.5.2) for full examples.`,
        code: `let chassis = new Sprite(200, 300, 80, 20);
let wheel = new Sprite(180, 320, 20);
new WheelJoint(chassis, wheel);

function update() {
  if (kb.pressing('right')) wheel.angularVelocity = 10;
  else if (kb.pressing('left')) wheel.angularVelocity = -10;
  else wheel.angularVelocity = 0;
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
        body: `You don't need sprite sheets to animate. The global frameCount increments every frame — combine it with Math.sin / Math.cos / modulo to animate almost any property smoothly.

For more advanced needs, q5play has Ani (frame-based animation from a sprite sheet) and Anis (a named collection of Ani animations). See the q5play.d.ts reference for details.`,
        code: `let s;

function setup() {
  new Canvas(400, 400);
  s = new Sprite(200, 200, 50, 50);
  s.collider = 'none';
}

function update() {
  s.rotation = frameCount / 30;
  s.scale = 1 + 0.3 * Math.sin(frameCount / 10);
  s.color = (frameCount % 60 < 30) ? 'cyan' : 'magenta';
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
        body: `text(string, x, y) draws text at the given position. Call it from draw(), after background() so it isn't erased.

textSize(px) sets the font size. fill(color) sets the text color.

For a HUD that stays fixed while the camera scrolls, draw text using mouse/screen coordinates rather than world coordinates — or reset the camera briefly before drawing the HUD.`,
        code: `let score = 0;

function draw() {
  background('#112');
  fill('white');
  textSize(24);
  text('Score: ' + score, 14, 30);

  if (gameOver) {
    textSize(40);
    fill('red');
    text('GAME OVER', 120, 220);
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
