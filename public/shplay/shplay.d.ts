// shPlay type declarations — hand-authored from public/shplay/shplay.js.
// Covers the full public API surface exported by the engine IIFE.

// ---- vector types --------------------------------------------------------

interface Vec2 {
  x: number;
  y: number;
}

// ---- animation -----------------------------------------------------------

declare class Ani {
  name: string;
  frameCount: number;
  frameDelay: number;
  frame: number;
  spriteSheet: HTMLImageElement;
}

declare class Anis {
  [name: string]: Ani;
}

// ---- sprite --------------------------------------------------------------

declare class Sprite {
  constructor(x: number, y: number);
  constructor(x: number, y: number, d: number);
  constructor(x: number, y: number, w: number, h: number);
  constructor(x: number, y: number, w: number, h: number, bodyType: 'static' | 'kinematic' | 'dynamic');

  pos: Vec2;
  vel: Vec2;
  x: number;
  y: number;
  color: string;
  rotation: number;
  angularVelocity: number;
  layer: number;
  visible: boolean;
  scale: Vec2;
  stroke: string | null;
  strokeWeight: number;
  w: number;
  h: number;
  shape: 'circle' | 'rect';
  body: 'static' | 'kinematic' | 'dynamic';
  collider: 'static' | 'kinematic' | 'dynamic' | 'none';
  diameter: number;
  bounciness: number;
  friction: number;
  ani: Ani | null;
  image: string | HTMLImageElement | null;

  addAni(name: string, sheetUrl: string, frameCount: number): Ani;
  changeAni(name: string): void;
  applyForce(fx: number, fy: number): void;
  overlaps(other: Sprite | Group): boolean;
  overlaps(other: Group, cb: (self: Sprite, other: Sprite) => void): boolean;
  colliding(other: Sprite | Group): number;
  delete(): void;
  remove(): void;
}

// ---- group ---------------------------------------------------------------

declare class Group extends Array<Sprite> {
  Sprite: typeof Sprite;

  newSprite(x: number, y: number, w?: number, h?: number): Sprite;
  push(...sprites: Sprite[]): number;
  remove(s: Sprite): void;
  overlaps(other: Sprite | Group, cb?: (self: Sprite, other: Sprite) => void): boolean;
}

// ---- joints --------------------------------------------------------------

interface JointOptions {
  anchor?: Vec2;
  length?: number;
  axis?: Vec2;
  maxForce?: number;
}

declare class Joint {
  delete(): void;
}

declare class HingeJoint extends Joint {
  constructor(a: Sprite, b: Sprite, opt?: JointOptions);
}

declare class DistanceJoint extends Joint {
  constructor(a: Sprite, b: Sprite, opt?: JointOptions);
  length: number;
}

declare class SliderJoint extends Joint {
  constructor(a: Sprite, b: Sprite, opt?: JointOptions);
}

declare class WheelJoint extends Joint {
  constructor(a: Sprite, b: Sprite, opt?: JointOptions);
}

declare class GrabberJoint extends Joint {
  constructor(a: Sprite, b: Sprite, opt?: JointOptions);
}

declare class GlueJoint extends Joint {
  constructor(a: Sprite, b: Sprite);
}

// ---- world ---------------------------------------------------------------

interface World {
  gravity: Vec2;
  getSpriteAt(x: number, y: number): Sprite | undefined;
}

// ---- input ---------------------------------------------------------------

interface Kb {
  pressing(key: string): boolean;
  presses(key: string): boolean;
}

interface Mouse {
  x: number;
  y: number;
  pressing(): boolean;
  presses(): boolean;
  released(): boolean;
}

// ---- canvas --------------------------------------------------------------

declare class Canvas {
  constructor(w: number, h: number);
}

// ---- globals -------------------------------------------------------------

declare const world: World;
declare const camera: Vec2;
declare const kb: Kb;
declare const mouse: Mouse;
declare const allSprites: Group;
declare const frameCount: number;

declare function background(color: string): void;
declare function text(str: string, x: number, y: number, size?: number, color?: string): void;
declare function fill(c: string | number): void;
declare function textSize(px: number): void;
declare function textAlign(mode: 'left' | 'center' | 'right'): void;

declare const CENTER: 'center';
declare const LEFT: 'left';
declare const RIGHT: 'right';

declare function storeItem(name: string, val: any): void;
declare function getItem(name: string): any;
declare function removeItem(name: string): void;

declare function start(): void;
