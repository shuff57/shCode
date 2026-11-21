// spaSHial API, draft 0 (2026-11-21). The 3D sibling of moSHion.
//
// This file IS the contract: the engine underneath (three.js on WebGL2 today,
// WebGPU maybe later; a physics library chosen by plans/spashial/README.md)
// can change without a lesson noticing. Mirror moSHion wherever 3D allows, so a
// student who knows Sprite already knows Asset. Every departure is marked
// "DIFFERS FROM moSHion" so it can be argued with.
//
// Conventions (all different from the old shPlay facade, deliberately):
//   - Y is UP, X right, Z toward the viewer (right-handed). One unit is about a
//     metre; a default shape is 1 unit across.
//   - Angles are DEGREES, like moSHion. (shPlay used radians + a helper.)
//   - Four colliders, the same words as moSHion: 'dynamic' | 'static' |
//     'kinematic' | 'none'.
//   - The touch verbs are moSHion's table, word for word.
//   - Physics steps at a fixed 60 Hz whatever the monitor does.
//
// Names that are the SAME as moSHion's keep moSHion's meaning (Kb, Mouse, Sound,
// storeItem, ...). They are declared here in slim form so this file stands
// alone: moSHion and spaSHial are never loaded together, so both define globals
// like `Group` and `world`. A build step merges the shared declarations later.

// ---- vectors ----------------------------------------------------------------

interface Vec3 { x: number; y: number; z: number }

/** A 3D vector with the usual maths, live where it hangs off a Asset:
 *  `ball.pos.set(0, 5, 0)` moves the ball. Same class as moSHion's Vector. */
declare class Vector implements Vec3 {
  constructor(x?: number, y?: number, z?: number);
  x: number; y: number; z: number;
  set(x: number, y?: number, z?: number): this;
  copy(): Vector;
  add(v: Vec3 | number): this;
  sub(v: Vec3 | number): this;
  mult(n: number): this;
  mag(): number;
  normalize(): this;
  dist(v: Vec3): number;
  dot(v: Vec3): number;
  cross(v: Vec3): Vector;
}
declare function createVector(x?: number, y?: number, z?: number): Vector;

type Collider = 'dynamic' | 'static' | 'kinematic' | 'none';
type AssetShape = 'box' | 'sphere' | 'cylinder' | 'capsule' | 'cone' | 'torus' | 'hull' | 'mesh';

// ---- Asset (moSHion's Sprite) -------------------------------------------------

declare class Asset {
  /** No arguments: a 1x1x1 box in front of the camera. */
  constructor();
  constructor(x: number, y: number, z: number);
  /** One size: a cube (or a sphere of that diameter, with shape 'sphere'). */
  constructor(x: number, y: number, z: number, size: number);
  constructor(x: number, y: number, z: number, w: number, h: number, d: number);
  /** `new Asset(0, 5, 0, 2, 'static')` is a 2-unit static cube. */
  constructor(x: number, y: number, z: number, size: number, collider: Collider);
  constructor(x: number, y: number, z: number, w: number, h: number, d: number, collider: Collider);

  /** Where its centre is, live (see Vector). */
  pos: Vector;
  /** Units per frame at 60 fps, like moSHion's px per frame. */
  vel: Vector;
  x: number; y: number; z: number;

  /** Euler angles in DEGREES, applied Y then X then Z (turn, pitch, roll). A
   *  setter wins over physics for that frame; for a dynamic body prefer forces. */
  rotation: Vector;
  /** Degrees per frame about each axis. */
  angularVelocity: Vector;

  /** DIFFERS FROM moSHion: three sizes. Setting one resizes the collider too; a
   *  sphere has one size (`diameter`), a capsule has `diameter` and `h`. */
  w: number; h: number; d: number;
  diameter: number;
  shape: AssetShape;
  /** Visual only, like moSHion's scale: the collider keeps its size. */
  scale: Vector;

  /** Any CSS colour: 'tomato', '#ff79c6'. */
  color: string;
  /** Named art from the same texture catalog as moSHion (`textureNames()`),
   *  wrapped onto the shape. null goes back to the plain colour. */
  texture: string | null;
  /** A glTF model from the Library (kind 'model'); it draws instead of the
   *  shape, and the collider stays the shape (or `shape = 'hull'` to fit it). */
  model: string | null;
  /** 0 = matt chalk, 1 = polished metal. */
  metalness: number;
  roughness: number;
  opacity: number;
  visible: boolean;
  /** Draws the collider's outline, to see what really touches. */
  debug: boolean;

  collider: Collider;
  bounciness: number;
  friction: number;
  density: number;
  mass: number;
  /** DIFFERS FROM moSHion: a cheap way to keep a body upright. true stops it
   *  tipping over (a character); the three axes are `lockRotation.x` etc. */
  lockRotation: boolean | { x?: boolean; y?: boolean; z?: boolean };
  /** Billboard label above the body, always facing the camera. */
  text: string | number | null;
  textColor: string;
  textSize: number;

  applyForce(fx: number, fy: number, fz: number): void;
  /** An instant kick (newton-seconds); a jump is `applyImpulse(0, 6, 0)`. */
  applyImpulse(ix: number, iy: number, iz: number): void;
  applyTorque(tx: number, ty: number, tz: number): void;
  /** Points the body's front (-Z) at a place or body. */
  lookAt(x: number, y: number, z: number): void;
  lookAt(target: Vec3): void;
  distanceTo(x: number, y: number, z: number): number;
  distanceTo(target: Vec3): number;
  moveTowards(target: Vec3, tracking?: number): void;
  moveAway(target: Vec3, repel?: number): void;
  clone(): Asset;
  /** Takes it out of the world: it stops drawing and colliding. */
  remove(): void;
  delete(): void;
  /** Pointer interaction by ray from the camera, same verbs as moSHion's SpriteMouse. */
  mouse: AssetMouse;

  // The touch verbs: the table is moSHion's, word for word.
  //               first frame   every frame (count)   last frame
  //   physics     collides      colliding             collided
  //   overlap     overlaps*     overlapping           overlapped
  overlaps(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): boolean;
  colliding(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): number;
  collides(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): boolean;
  collided(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): boolean;
  overlapping(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): number;
  overlapped(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): boolean;
}

interface AssetMouse {
  hovering(): boolean;
  hovers(): boolean;
  hovered(): boolean;
  presses(button?: 'left' | 'center' | 'right'): boolean;
  pressing(button?: 'left' | 'center' | 'right'): boolean;
  released(button?: 'left' | 'center' | 'right'): boolean;
}

/** Friendly shortcuts that are just bodies with a shape, so shPlay-style lessons
 *  read the same: `new Cube(0, 1, 0)` is `new Asset(0, 1, 0, 1)`. */
declare class Cube extends Asset {}
declare class Sphere extends Asset {}
declare class Cylinder extends Asset {}
declare class Capsule extends Asset {}
declare class Cone extends Asset {}
/** A donut lying flat. Its collider is a real ring of 16 capsules (see README), accurate to about 2 cm,
 *  but it costs several times a sphere: a game should use few of them. */
declare class Torus extends Asset {}
/** A big flat static body: a floor. `new Floor()` fills the view; `new Floor(40)` is 40 across. */
declare class Floor extends Asset { constructor(size?: number) }

// ---- Group (moSHion's Group) -------------------------------------------------

declare class Group extends Array<Asset> {
  /** `new coins.Asset(x, y, z)` makes a body with this group's settings, in it. */
  Asset: typeof Asset;
  newAsset(x: number, y: number, z: number, size?: number): Asset;
  color: string;
  texture: string | null;
  model: string | null;
  collider: Collider;
  bounciness: number;
  friction: number;
  overlaps(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): boolean;
  colliding(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): number;
  collides(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): boolean;
  collided(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): boolean;
  overlapping(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): number;
  overlapped(other: Asset | Group, cb?: (self: Asset, other: Asset) => void): boolean;
  applyForce(fx: number, fy: number, fz: number): void;
  /** Deletes members that fell or flew past `margin` units outside the play area. */
  cull(margin?: number, cb?: (body: Asset, n: number) => void): number;
  add(...bodies: Asset[]): number;
  contains(b: Asset): boolean;
  remove(b: Asset): void;
  delete(): void;
  amount: number;
}
declare const allAssets: Group;

/** Builds a level from layers of text, bottom layer first: each character the
 *  legend names becomes one `new group.Asset()` at that cell. Like moSHion's
 *  Tiles with a floor number. */
declare class Tiles extends Group {
  constructor(layers: string[][], x: number, y: number, z: number, cell: number, legend: Record<string, Group>);
}

// ---- joints (phase 3; names follow moSHion's) --------------------------------

interface JointOptions { anchor?: Vec3; axis?: Vec3; collideConnected?: boolean }
declare class Joint { remove(): void }
declare class HingeJoint extends Joint { constructor(a: Asset, b: Asset, opts?: JointOptions) }
declare class DistanceJoint extends Joint { constructor(a: Asset, b: Asset, opts?: JointOptions & { length?: number }) }
declare class SliderJoint extends Joint { constructor(a: Asset, b: Asset, opts?: JointOptions) }
/** Welds two bodies into one rigid piece. */
declare class GlueJoint extends Joint { constructor(a: Asset, b: Asset) }

// ---- world --------------------------------------------------------------------

interface RayHit {
  asset: Asset | null;
  point: Vec3;
  /** Unit length, pointing away from the surface that was hit. */
  normal: Vec3;
  /** 0..1 along the ray. */
  fraction: number;
}

interface World {
  /** DIFFERS FROM moSHion only in having three axes. Starts at (0, 0, 0): nothing
   *  falls until `world.gravity.y = -10`, as in moSHion. (Open question: should
   *  3D start with gravity on? See README.) */
  gravity: Vec3;
  /** The topmost body under a screen point (what the mouse is over), or undefined. */
  getAssetAt(screenX: number, screenY: number): Asset | undefined;
  /** Closest SOLID body on the line (sensors and collider 'none' are looked
   *  through), or null. `world.rayCast(p.pos, { x: p.x, y: p.y - 1.1, z: p.z })` asks "on the ground?". */
  rayCast(from: Vec3, to: Vec3): RayHit | null;
  /** Every body along the line, nearest first. */
  rayCastAll(from: Vec3, to: Vec3): RayHit[];
  /** Radial impulse; falloff 0..1 is the share left at the rim. */
  explodeAt(x: number, y: number, z: number, radius?: number, magnitude?: number, falloff?: number): void;
  allowSleeping: boolean;
  /** Default true. false hands stepping to physicsUpdate(). */
  autoStep: boolean;
  physicsUpdate(step?: number): void;
  /** Speed cap in units per frame; raise it for fast bodies at the cost of tunnelling. */
  maxSpeed: number;
}
declare const world: World;

// ---- camera and light ---------------------------------------------------------

interface Camera {
  pos: Vector;
  x: number; y: number; z: number;
  /** Degrees. Default 60. */
  fov: number;
  /** Points the camera at a place or body. */
  lookAt(x: number, y: number, z: number): void;
  lookAt(target: Vec3): void;
  /** Follows a body from behind and above, smoothly. `tracking` is the share of the gap closed each frame. */
  follow(target: Asset, opts?: { distance?: number; height?: number; tracking?: number }): void;
  /** Circles a point. Mouse drag turns it when `drag` is true. */
  orbit(target: Vec3, opts?: { distance?: number; drag?: boolean }): void;
  /** Stops follow() or orbit() and leaves the camera where it is. */
  free(): void;
}
declare const camera: Camera;

interface AmbientLight { color: string; intensity: number }
interface SunLight { color: string; intensity: number; direction: Vec3; shadows: boolean }
declare const ambientLight: AmbientLight;
declare const sunLight: SunLight;
declare class PointLight {
  constructor(x: number, y: number, z: number, color?: string, intensity?: number);
  pos: Vector; color: string; intensity: number; remove(): void;
}
declare class SpotLight {
  constructor(x: number, y: number, z: number, color?: string, intensity?: number);
  pos: Vector; color: string; intensity: number; angle: number; lookAt(target: Vec3): void; remove(): void;
}

/** The sky colour: a CSS colour or a grey 0-255. */
declare function background(c: string | number): void;

// ---- how fast it draws on an integrated GPU -----------------------------------
// The primary target is a desktop with integrated graphics, so cheap is the
// default and every expensive thing is opt-in.

/** 'auto' (default) lowers the render scale when frames run long and raises it
 *  again when there is room. 'low' | 'medium' | 'high' fix it. */
declare let quality: 'auto' | 'low' | 'medium' | 'high';
/** Draws frame time, draw calls and triangle count in a corner. */
declare function showPerf(on?: boolean): void;

// ---- the hooks (same four as moSHion) -------------------------------------------

declare function setup(): void;
/** Before the physics step, 60 times a second whatever the screen does. */
declare function update(step: number): void;
/** After physics, before bodies render: a 2D layer UNDER the scene is not a
 *  thing in 3D, so use this for scene setup that changes each frame (background). */
declare function draw(): void;
/** After the scene renders, in 2D screen space: the HUD. text(), fill(), rect(),
 *  circle() and the rest of moSHion's drawing calls work here, unchanged. */
declare function drawTop(): void;
declare function preload(): void;
/** `new Canvas(w, h)`: the 3D canvas, same call as moSHion. */
declare class Canvas { constructor(w: number, h: number) }

// ---- input (identical to moSHion's; slim here) -----------------------------------

interface Kb {
  presses(key?: string): boolean;
  pressing(key?: string): number;
  released(key?: string): boolean;
}
declare const kb: Kb;
interface Mouse {
  x: number; y: number;
  presses(button?: 'left' | 'center' | 'right'): boolean;
  pressing(button?: 'left' | 'center' | 'right'): number;
  released(button?: 'left' | 'center' | 'right'): boolean;
  /** Pointer lock for first-person look: `mouse.lock()`; `mouse.moved` is the turn since last frame. */
  lock(): void;
  moved: { x: number; y: number };
}
declare const mouse: Mouse;

// ---- time, maths, storage, sound (identical to moSHion's; names only) -------------

declare const frameCount: number;
declare const deltaTime: number;
declare const width: number;
declare const height: number;
declare function random(a?: number, b?: number): number;
declare function degrees(rad: number): number;
declare function radians(deg: number): number;
declare function storeItem(name: string, val: any): void;
declare function getItem(name: string): any;
declare function removeItem(name: string): void;
declare function clearStorage(): void;
declare function textureNames(): string[];
declare class Sound { play(): void; stop(): void; volume: number; loop: boolean }
declare function loadSound(url: string): Sound;
/** Loads a glTF model by Library name or URL. Like loadImage, usable in preload(). */
declare function loadModel(nameOrUrl: string): { ready: boolean };

// ---- online (names identical to moSHion's; the payload is 3D) -----------------------

type MultiplayerMode = 'none' | 'local' | 'coop' | 'versus';
declare function multiplayer(mode: MultiplayerMode, players: number, opts?: { realtime?: boolean }): void;
declare const online: {
  status: string;
  code: string | null;
  seat: number;
  isHost: boolean;
  host(players?: number): void;
  join(code: string): void;
  leave(): void;
  /** Up to 8 bodies, 15 Hz. Each carries position AND rotation, not just x/y. */
  share(...bodies: Asset[]): void;
  peers: Record<number, Asset[]>;
  sharedBy(seat: number): Asset[];
};
