// shPlay — beginner-friendly facade over @dylanebert/shallot.
// This bundle is ES-module loaded by `public/shplay/runner.html`.
// User code references globals (`new Cube(...)`, `kb.pressing(...)`, `setup()`,
// `draw()`) — exactly the q5play model — so students don't see ECS / quaternions.

import {
  run,
  type State,
  type Plugin,
  Transform,
  Part,
  Camera,
  Tonemap,
  AmbientLight,
  DirectionalLight,
  Inputs,
} from '@dylanebert/shallot';
import { OrbitPlugin, Orbit } from '@dylanebert/shallot/extras';

let _state: State | null = null;
let _userSetupRan = false;
let _activeCamera = -1;

function getActiveCamera(state: State): number {
  if (_activeCamera >= 0 && state.entityExists(_activeCamera)) return _activeCamera;
  for (const eid of state.query([Camera])) {
    _activeCamera = eid;
    return eid;
  }
  return -1;
}

function parseColor(c: number | string): number {
  if (typeof c === 'number') return c & 0xffffff;
  const s = c.trim();
  if (s.startsWith('#')) return parseInt(s.slice(1), 16) & 0xffffff;
  if (s.startsWith('0x')) return parseInt(s.slice(2), 16) & 0xffffff;
  // Named CSS color via canvas trick (cached).
  const named = NAMED_COLORS[s.toLowerCase()];
  if (named !== undefined) return named;
  return 0xffffff;
}

const NAMED_COLORS: Record<string, number> = {
  white: 0xffffff, black: 0x000000, red: 0xff0000, green: 0x00ff00, blue: 0x0000ff,
  yellow: 0xffff00, cyan: 0x00ffff, magenta: 0xff00ff, gray: 0x808080, grey: 0x808080,
  orange: 0xffa500, purple: 0x800080, pink: 0xffc0cb, tomato: 0xff6347,
  deepskyblue: 0x00bfff, hotpink: 0xff69b4, limegreen: 0x32cd32, gold: 0xffd700,
  saddlebrown: 0x8b4513, crimson: 0xdc143c,
};

function keyToCode(key: string): string {
  if (key.length === 1) {
    const ch = key.toUpperCase();
    if (ch >= 'A' && ch <= 'Z') return 'Key' + ch;
    if (ch >= '0' && ch <= '9') return 'Digit' + ch;
  }
  const lower = key.toLowerCase();
  if (lower === 'space' || lower === ' ') return 'Space';
  if (lower === 'enter') return 'Enter';
  if (lower === 'shift') return 'ShiftLeft';
  if (lower === 'left') return 'ArrowLeft';
  if (lower === 'right') return 'ArrowRight';
  if (lower === 'up') return 'ArrowUp';
  if (lower === 'down') return 'ArrowDown';
  return key;
}

interface Vec3Proxy {
  x: number; y: number; z: number;
}

function vec3FromTransform(eid: number, axis: 'pos' | 'rot' | 'scale'): Vec3Proxy {
  const map = {
    pos: ['posX', 'posY', 'posZ'] as const,
    rot: ['rotX', 'rotY', 'rotZ'] as const,
    scale: ['scaleX', 'scaleY', 'scaleZ'] as const,
  }[axis];
  return {
    get x() { return (Transform as any)[map[0]][eid]; },
    set x(v) { (Transform as any)[map[0]][eid] = v; },
    get y() { return (Transform as any)[map[1]][eid]; },
    set y(v) { (Transform as any)[map[1]][eid] = v; },
    get z() { return (Transform as any)[map[2]][eid]; },
    set z(v) { (Transform as any)[map[2]][eid] = v; },
  };
}

abstract class Entity {
  eid: number;
  constructor() {
    if (!_state) throw new Error('shPlay not ready — create entities inside setup() or draw()');
    this.eid = _state.addEntity();
    _state.addComponent(this.eid, Transform);
  }
  get position(): Vec3Proxy { return vec3FromTransform(this.eid, 'pos'); }
  get rotation(): Vec3Proxy { return vec3FromTransform(this.eid, 'rot'); }
  get scale(): Vec3Proxy { return vec3FromTransform(this.eid, 'scale'); }
}

abstract class Shape extends Entity {
  constructor(x: number, y: number, z: number, shapeId: number) {
    super();
    _state!.addComponent(this.eid, Part);
    Transform.posX[this.eid] = x;
    Transform.posY[this.eid] = y;
    Transform.posZ[this.eid] = z;
    Part.shape[this.eid] = shapeId;
    Part.color[this.eid] = 0xffffff;
  }
  set color(c: number | string) { Part.color[this.eid] = parseColor(c); }
  get color(): number { return Part.color[this.eid] as unknown as number; }
  set size(s: number) {
    Part.sizeX[this.eid] = s;
    Part.sizeY[this.eid] = s;
    Part.sizeZ[this.eid] = s;
  }
}

class CubeImpl extends Shape   { constructor(x = 0, y = 0, z = 0) { super(x, y, z, 0); } } // Box
class SphereImpl extends Shape { constructor(x = 0, y = 0, z = 0) { super(x, y, z, 1); } } // Sphere
class PlaneImpl extends Shape  { constructor(x = 0, y = 0, z = 0) { super(x, y, z, 3); } } // Plane

const kb = {
  pressing(key: string): boolean {
    const inputs = _state?.getResource(Inputs);
    return inputs ? inputs.isKeyDown(keyToCode(key)) : false;
  },
  presses(key: string): boolean {
    const inputs = _state?.getResource(Inputs);
    return inputs ? inputs.isKeyPressed(keyToCode(key)) : false;
  },
  releases(key: string): boolean {
    const inputs = _state?.getResource(Inputs);
    return inputs ? inputs.isKeyReleased(keyToCode(key)) : false;
  },
};

function background(c: number | string): void {
  if (!_state) return;
  const cam = getActiveCamera(_state);
  if (cam < 0) return;
  Camera.clearColor[cam] = parseColor(c);
}

function spawnDefaults(state: State): void {
  // Orbit camera looking at origin. Orbit handles its own positioning;
  // distance/pitch/yaw on the Orbit component drive the world transform.
  const cam = state.addEntity();
  state.addComponent(cam, Transform);
  state.addComponent(cam, Camera);
  state.addComponent(cam, Tonemap);
  state.addComponent(cam, Orbit);
  Orbit.distance[cam] = 8;
  Orbit.pitch[cam] = Math.PI / 8;
  _activeCamera = cam;

  // Ambient fill so shadowed faces aren't black.
  const ambient = state.addEntity();
  state.addComponent(ambient, Transform);
  state.addComponent(ambient, AmbientLight);

  // Directional sun — direction is a unit vector via DirectionalLight.directionX/Y/Z,
  // not via Transform rotation.
  const sun = state.addEntity();
  state.addComponent(sun, Transform);
  state.addComponent(sun, DirectionalLight);
  DirectionalLight.directionX[sun] = -0.5;
  DirectionalLight.directionY[sun] = -0.7;
  DirectionalLight.directionZ[sun] = -0.5;
}

let _tickCount = 0;

const ShPlayPlugin: Plugin = {
  name: 'ShPlay',
  systems: [
    {
      group: 'simulation',
      update(state: State) {
        _state = state;
        _tickCount++;
        if (!_userSetupRan) {
          _userSetupRan = true;
          spawnDefaults(state);
          const w = window as any;
          if (typeof w.setup === 'function') {
            try { w.setup(); }
            catch (e) { console.error('setup() error:', e); }
          }
        }
        const w = window as any;
        if (typeof w.draw === 'function') {
          try { w.draw(); }
          catch (e) { console.error('draw() error:', e); }
        }
      },
    },
  ],
};

export async function boot(): Promise<void> {
  await run({ plugins: [OrbitPlugin, ShPlayPlugin] });
}

// Expose the beginner facade as globals.
const w = window as any;
w.Cube = CubeImpl;
w.Sphere = SphereImpl;
w.Plane = PlaneImpl;
w.kb = kb;
w.background = background;
w.shplay = {
  boot,
  // Debug-only handle so the smoke test can poke at internals without
  // exporting them publicly. Remove once the wrapper is stable.
  _debug: () => ({ tickCount: _tickCount, hasState: !!_state, userSetupRan: _userSetupRan, activeCamera: _activeCamera, entityCount: _state ? _state.getAllEntities().length : 0 }),
};
