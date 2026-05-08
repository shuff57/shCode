// In-app shPlay reference for the AI help endpoint.
// Reuses DocSection / DocPage / RelevantDoc types from q5play-docs.
// 13 sections cover all Unit 3 Module Phase 0 APIs.
// Bodies are stubs here; content is enriched per-module during Waves 1–13.

import type { DocSection, RelevantDoc } from './q5play-docs';

export type { DocSection, RelevantDoc };

export const SHPLAY_DOCS: DocSection[] = [
  {
    slug: 'shplay-overview',
    title: 'Overview',
    pages: [
      {
        title: 'What is shPlay?',
        body: `shPlay is a beginner-friendly 3D facade over three.js, in the spirit of q5play. It exposes setup() and draw() just like q5play, but the canvas is a 3D WebGL scene instead of a 2D canvas.

You do not import anything. You do not install anything. You write setup() once and draw() runs every frame. All shPlay globals (Cube, Sphere, Plane, kb, camera, background, frameCount) are available automatically.

The coordinate system is right-handed with Y pointing up. The default camera sits at (0, 3, 7) looking at the world origin (0, 0, 0).`,
        code: `let cube;
function setup() {
  cube = new Cube(0, 0, 0);
  cube.color = 'tomato';
}
function draw() {
  background('#222');
  cube.rotation.y += 0.01;
}`,
      },
      {
        title: 'setup() and draw() lifecycle',
        body: `setup() runs once when the sketch starts. Create your shapes here.
draw() runs every frame (approximately 60 fps). Move, rotate, and update shapes here.

frameCount increments by 1 each frame — use it for time-based animation.
deltaTime is the time in seconds since the last frame, capped at 0.1. Use it for physics and smooth movement that does not depend on frame rate.`,
        code: `let cube;
function setup() {
  cube = new Cube(0, 0, 0);
}
function draw() {
  background('#111');
  cube.rotation.y = frameCount * 0.02;
}`,
      },
      {
        title: 'Coordinate system — Y-up, right-handed',
        body: `shPlay uses a right-handed Y-up coordinate system (the three.js default).

- Positive X goes to the right.
- Positive Y goes up (unlike screen coordinates where Y increases downward).
- Positive Z comes toward the viewer; negative Z goes into the scene.

The right-hand rule: curl your fingers from X toward Y — your thumb points in the positive Z direction.

The world origin (0, 0, 0) is the center of the scene. The default camera is at (0, 3, 7) looking at the origin.`,
      },
    ],
  },

  {
    slug: 'shplay-shapes',
    title: 'Shapes',
    pages: [
      {
        title: 'Cube — constructor and properties',
        body: `new Cube(x, y, z, size) creates a box at position (x, y, z) with uniform side length size (default 1). All parameters are optional and default to 0 / 1.

Properties: .position (Vector3 with .x .y .z), .rotation (Euler with .x .y .z in radians), .scale (Vector3), .color (string setter/getter), .size (uniform scale shorthand).

Call .remove() to remove the cube from the scene and free its memory.`,
        code: `let cube = new Cube(0, 0, 0, 1.5);
cube.color = 'tomato';
cube.size = 2;`,
      },
      {
        title: 'Sphere — constructor and properties',
        body: `new Sphere(x, y, z, radius) creates a sphere at position (x, y, z) with the given radius (default 0.5).

Has the same .position, .rotation, .scale, .color, .size, and .remove() as Cube.`,
        code: `let ball = new Sphere(2, 0, 0, 0.8);
ball.color = 'limegreen';`,
      },
      {
        title: 'Plane — flat floor or wall',
        body: `new Plane(x, y, z, width, depth) creates a flat rectangle at position (x, y, z). It is rotated to lie flat on the XZ plane (horizontal floor) by default. Width and depth default to 5.

Plane defaults isGround = true, meaning physics objects will land on it automatically.

Has .position, .rotation, .scale, .color, .size, and .remove().`,
        code: `let floor = new Plane(0, -1, 0, 10, 10);
floor.color = '#444';`,
      },
      {
        title: 'Cone — tip points up by default',
        body: `new Cone(x, y, z, radiusBottom, height) creates a cone. radiusBottom defaults to 0.5, height defaults to 1. The tip points up (positive Y) by default.

Does NOT have a .size shorthand (use .scale.x/.scale.y/.scale.z for non-uniform scaling).
Has .position, .rotation, .scale, .color, and .remove().`,
        code: `let cone = new Cone(0, 0, 0, 0.5, 2);
cone.color = 'orange';
cone.rotation.y += 0.01;`,
      },
      {
        title: 'Cylinder — uniform radius, no taper',
        body: `new Cylinder(x, y, z, radius, height) creates a cylinder. radius defaults to 0.5, height defaults to 1. Top and bottom radii are equal (no taper).

Does NOT have a .size shorthand. Has .position, .rotation, .scale, .color, and .remove().`,
        code: `let cyl = new Cylinder(-2, 0, 0, 0.4, 2);
cyl.color = 'deepskyblue';`,
      },
      {
        title: 'Torus — donut shape with two radii',
        body: `new Torus(x, y, z, radius, tube) creates a donut shape. radius is the distance from the torus center to the center of the tube (default 0.6). tube is the radius of the tube itself (default 0.2).

Does NOT have a .size shorthand. Has .position, .rotation, .scale, .color, and .remove().`,
        code: `let torus = new Torus(2, 0, 0, 0.6, 0.15);
torus.color = 'gold';`,
      },
    ],
  },

  {
    slug: 'shplay-transforms',
    title: 'Transforms',
    pages: [
      {
        title: '.position — move shapes in 3D',
        body: `Every shape has a .position property — a three.js Vector3 object with .x, .y, and .z number fields.

Set individual axes: shape.position.x = 3
Mutate in draw() to animate: shape.position.x += 0.05`,
        code: `cube.position.x = 3;
cube.position.y = 1;
cube.position.z = -2;`,
      },
      {
        title: '.rotation — Euler angles in radians',
        body: `Every shape has a .rotation property — a three.js Euler object with .x, .y, .z fields, all in radians.

Increment in draw() to spin: shape.rotation.y += 0.01
Set a fixed angle with radians(): shape.rotation.y = radians(45)`,
        code: `cube.rotation.y += 0.01;
cube.rotation.x = radians(30);`,
      },
      {
        title: '.scale — non-uniform stretching',
        body: `Every shape has a .scale property — a Vector3 with .x, .y, .z. Each axis is scaled independently.

Cube and Sphere also have a .size shorthand that sets scale.x = scale.y = scale.z uniformly.`,
        code: `cube.scale.x = 2;
cube.scale.y = 0.5;
cube.size = 1.5; // Cube/Sphere only`,
      },
    ],
  },

  {
    slug: 'shplay-color',
    title: 'Color',
    pages: [
      {
        title: 'Setting shape color',
        body: `Every shape has a .color property. Assign any CSS color string — named colors, hex strings, or 0x hex numbers.

Named colors include: white, black, red, green, blue, yellow, cyan, magenta, gray, orange, purple, pink, tomato, deepskyblue, hotpink, limegreen, gold, and more.

background(color) sets the scene clear color each frame (like p5's background() in 2D).`,
        code: `cube.color = 'tomato';
sphere.color = '#ff8800';
floor.color = 0x444444;
background('#111');`,
      },
    ],
  },

  {
    slug: 'shplay-input',
    title: 'Input (kb)',
    pages: [
      {
        title: 'kb — keyboard input (same as q5play)',
        body: `The kb object works exactly like q5play's kb. It has three methods:

kb.pressing('key') — returns true while the key is held down.
kb.presses('key') — returns true only on the first frame the key is pressed.
kb.releases('key') — returns true only on the first frame the key is released.

Key names: single letters ('a', 'w'), digits ('1'), or special names ('space', 'enter', 'left', 'right', 'up', 'down').`,
        code: `function draw() {
  if (kb.pressing('w')) cube.position.z -= 0.1;
  if (kb.pressing('s')) cube.position.z += 0.1;
  if (kb.presses('space')) cube.position.y += 1;
}`,
      },
    ],
  },

  {
    slug: 'shplay-camera',
    title: 'Camera',
    pages: [
      {
        title: 'camera.position — manual placement',
        body: `camera.position is the three.js camera's position Vector3. Set it in setup() to place the camera.

camera.lookAt(x, y, z) makes the camera face a point. It is sticky — the camera keeps facing that target every frame while in manual mode.

Manual lookAt only works when no follow or orbit mode is active.`,
        code: `function setup() {
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);
}`,
      },
      {
        title: 'camera.follow(target) — track a moving object',
        body: `camera.follow(target) makes the camera follow a shape each frame, staying behind and above it.

Optional offset: camera.follow(target, dx, dy, dz) — default offset is (0, 3, 7).

camera.clearFollow() returns to manual mode where camera.lookAt() works again.

Mode precedence: orbit > follow > lookAt. Setting follow cancels orbit; setting orbit cancels follow.`,
        code: `function setup() {
  player = new Sphere(0, 0, 0);
  camera.follow(player); // default offset: 0,3,7
}`,
      },
      {
        title: 'camera.orbit(speed) — rotate around origin',
        body: `camera.orbit(speed) rotates the camera around the world origin at speed radians per frame.

camera.clearOrbit() returns to manual mode.

While orbiting, camera.lookAt() is silently overridden each frame.`,
        code: `function setup() {
  camera.orbit(0.01);
}
// No draw() needed — orbit runs automatically in the frame loop.`,
      },
    ],
  },

  {
    slug: 'shplay-lights',
    title: 'Lights',
    pages: [
      {
        title: 'ambientLight — fills all surfaces equally',
        body: `window.ambientLight is a handle to the scene's ambient light, created by shPlay automatically.

ambientLight.intensity — 0 = pitch black, 0.5 = default, 1 = flat uniform light.
ambientLight.color — set to a color string to tint all ambient light.

Ambient light has no direction — it illuminates every surface equally regardless of where the surface faces.`,
        code: `ambientLight.intensity = 0.2;
ambientLight.color = '#ffe8d6'; // warm tint`,
      },
      {
        title: 'sunLight — directional light like the sun',
        body: `window.sunLight is a handle to the scene's directional (sun) light.

sunLight.intensity — default 1.2.
sunLight.color — color of the light.
sunLight.position — a Vector3. Moving it changes the direction the light comes FROM, not a physical source location. Think of it as a point infinitely far away in that direction.`,
        code: `sunLight.position.x = 10; // light comes from the right
sunLight.intensity = 2;
sunLight.color = 'orange';`,
      },
      {
        title: 'new PointLight(x, y, z, color, intensity)',
        body: `Creates a point light at position (x, y, z) that shines in all directions like a lantern. Falls off with distance.

.position, .color, .intensity, .remove()

Multiple PointLights can be added to a scene. More lights = more realistic but heavier on the GPU for complex scenes.`,
        code: `let lamp = new PointLight(0, 3, 0, 'white', 2);
// Orbit it in draw():
function draw() {
  lamp.position.x = Math.cos(frameCount * 0.02) * 4;
  lamp.position.z = Math.sin(frameCount * 0.02) * 4;
}`,
      },
      {
        title: 'new SpotLight(x, y, z, color, intensity)',
        body: `Creates a cone-shaped spotlight. Useful for theatrical highlights.

.position, .color, .intensity, .remove()

The spotlight always aims at the world origin by default. Use .position to move it around the scene.`,
        code: `let spot = new SpotLight(0, 5, 0, 'white', 3);`,
      },
    ],
  },

  {
    slug: 'shplay-materials',
    title: 'Materials',
    pages: [
      {
        title: 'metalness — surface reflectivity',
        body: `shape.metalness — 0.0 to 1.0. Default 0 (non-metallic, matte-ish).

0 = plastic/wood look. 1 = mirror-like metal. Metalness interacts with scene lights — it only looks good with at least one directional or point light.`,
        code: `sphere.metalness = 1.0;
sphere.roughness = 0.0; // shiny metal`,
      },
      {
        title: 'roughness — surface scattering',
        body: `shape.roughness — 0.0 to 1.0. Default varies. 0 = very shiny (tight specular highlight), 1 = very rough (diffuse, no highlight).

Combine with metalness for realistic materials: rough metal looks like brushed steel; smooth metal looks like chrome.`,
        code: `sphere.roughness = 0.2; // somewhat shiny`,
      },
      {
        title: 'wireframe — show geometry edges',
        body: `shape.wireframe — boolean, default false. Set to true to render only the shape's geometry edges, hiding the filled surface.

Useful for debugging geometry or creating a technical-drawing aesthetic.`,
        code: `cube.wireframe = true;`,
      },
    ],
  },

  {
    slug: 'shplay-groups',
    title: 'Groups',
    pages: [
      {
        title: 'Group — collection of shapes',
        body: `new Group() creates an empty collection. Use it to manage multiple shapes together.

g.add(shape) — add a shape to the group.
g.remove(shape) — remove the shape from the group AND call shape.remove() (disposes geometry and frees memory). Safe to call twice — the second call is a no-op.
g.forEach(fn) — iterate all shapes.
g.filter(fn) — return a plain array of matching shapes.
g.length — number of shapes in the group.
for (let s of g) — the group is iterable.`,
        code: `let coins = new Group();
function setup() {
  for (let i = 0; i < 5; i++) {
    let c = new Sphere(i * 2, 0, 0, 0.3);
    c.color = 'gold';
    coins.add(c);
  }
}
function draw() {
  for (let c of coins) {
    if (intersects(player, c)) coins.remove(c);
  }
}`,
      },
    ],
  },

  {
    slug: 'shplay-collision',
    title: 'Collision',
    pages: [
      {
        title: 'distance(a, b) — distance between two shapes',
        body: `distance(a, b) returns the distance between the center positions of two shPlay shape objects.

Works on any two shapes (Cube, Sphere, Plane, etc.) — they all have a .mesh.position internally.`,
        code: `let d = distance(player, coin);
if (d < 1.5) {
  // close enough to collect
}`,
      },
      {
        title: 'intersects(a, b) — sphere-sphere overlap',
        body: `intersects(a, b) returns true when the bounding spheres of the two shapes overlap.

This is fast and good enough for beginner collision detection. It is NOT pixel-perfect AABB — it works well for sphere-shaped objects but may miss corner hits on cubes.

For more precise platformer collision, use the physics system (usePhysics + isGround) instead.`,
        code: `if (intersects(player, coin)) {
  coins.remove(coin);
}`,
      },
    ],
  },

  {
    slug: 'shplay-physics',
    title: 'Physics',
    pages: [
      {
        title: 'usePhysics — opt-in gravity and velocity',
        body: `Physics is opt-in per shape. Set shape.usePhysics = true to register it in the physics loop.

When usePhysics is true the shape gets:
  shape.vel — { x, y, z } velocity in scene units per second
  shape.onGround — read-only boolean, true when resting on a ground surface
  shape.friction — horizontal velocity damping when on ground (default 0.85)

window.gravity — the downward acceleration in scene units/s^2 (default 9.8). Change it in setup().

Each frame (before your draw()):
  1. vel.y -= gravity * deltaTime
  2. position += vel * deltaTime
  3. AABB ground collision resolves penetrations
  4. friction damps vel.x/z when onGround`,
        code: `let player;
function setup() {
  player = new Sphere(0, 5, 0);
  player.usePhysics = true;
}
function draw() {
  if (kb.presses('space') && player.onGround) {
    player.vel.y = 5;
  }
  if (kb.pressing('a')) player.vel.x = -3;
  if (kb.pressing('d')) player.vel.x = 3;
}`,
      },
      {
        title: 'isGround — register a shape as a platform',
        body: `Setting shape.isGround = true registers the shape as a collision surface for physics objects.

Plane automatically has isGround = true (the floor is a ground surface by default). Cube platforms must be set manually: cube.isGround = true.

The AABB collision pass checks each physics object against each ground surface every frame. Calling shape.remove() automatically deregisters it from both physics and ground lists.`,
        code: `let platform = new Cube(0, 2, 0, 3, 0.4, 3);
platform.isGround = true;
platform.color = '#888';`,
      },
    ],
  },

  {
    slug: 'shplay-parenting',
    title: 'Parenting',
    pages: [
      {
        title: 'parent(child, parentObj) — attach shapes together',
        body: `parent(child, parentObj) attaches child.mesh as a child of parentObj.mesh (uses three.js scene graph parenting).

After parenting, the child's .position, .rotation, and .scale are LOCAL — relative to the parent's transform, not the world. Move the parent and the child comes along.

unparent(child) detaches the child and returns it to the scene root, preserving its world position.

Note: parent() shadows window.parent (the DOM parent frame). This is intentional — shPlay sketches run in an iframe and do not use window.parent.`,
        code: `let body, head;
function setup() {
  body = new Cube(0, 0, 0, 1, 1.5, 0.8);
  head = new Sphere(0, 1.2, 0, 0.5);
  parent(head, body); // head moves with body
}
function draw() {
  body.position.y = Math.sin(frameCount * 0.05) * 0.3; // head bobs too
}`,
      },
    ],
  },

  {
    slug: 'shplay-helpers',
    title: 'Helpers',
    pages: [
      {
        title: 'random(min, max)',
        body: `random(min, max) returns a random float in [min, max). Mirrors q5play's random() semantics that students already know.`,
        code: `let x = random(-5, 5);
let size = random(0.3, 1.2);
cube.color = '#' + Math.floor(random(0, 0xffffff)).toString(16).padStart(6, '0');`,
      },
      {
        title: 'radians(deg) and degrees(rad)',
        body: `radians(deg) converts degrees to radians: deg * Math.PI / 180.
degrees(rad) converts radians to degrees: rad * 180 / Math.PI.

three.js uses radians for all rotation values. Use radians() for readable code: cube.rotation.y = radians(45) instead of Math.PI / 4.`,
        code: `cube.rotation.y = radians(90); // quarter turn
cube.rotation.x = radians(frameCount * 1.5); // spin`,
      },
      {
        title: 'frameCount and deltaTime',
        body: `frameCount — integer, increments by 1 each frame. Use for time-based animation: shape.rotation.y = frameCount * 0.02.

deltaTime — seconds since the last frame, capped at 0.1. Use for physics and frame-rate-independent movement: shape.position.x += speed * deltaTime. Available as window.deltaTime.`,
        code: `function draw() {
  cube.rotation.y = frameCount * 0.02;
  player.position.x += 3 * deltaTime; // 3 units/second
}`,
      },
      {
        title: 'background(color)',
        body: `background(color) sets the scene clear color. Call it at the start of draw() to clear the background each frame, just like q5play's background().

Accepts any color string — named color, hex string, or 0x number.`,
        code: `function draw() {
  background('#111');
  // rest of draw()
}`,
      },
    ],
  },
];

// === findRelevantDocs — mirrors the q5play-docs algorithm ===
// Scores each page by keyword overlap (title: 5pt, code: 3pt, body: 1pt).
// Returns top-n pages for use in the AI help system prompt.

export function findRelevantDocs(keywords: string[], n = 3): RelevantDoc[] {
  const tokens = Array.from(
    new Set(
      keywords
        .map((k) => (k || '').toLowerCase().trim())
        .filter((k) => k.length >= 2),
    ),
  );
  if (tokens.length === 0) return [];

  const scored: { score: number; page: RelevantDoc }[] = [];
  for (const section of SHPLAY_DOCS) {
    for (const page of section.pages) {
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
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.page);
}
