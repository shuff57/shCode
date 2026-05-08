// shPlay — beginner-friendly 3D facade over three.js, in the spirit of q5play.
// Hand-written ES module, no build step. Exposes setup()/draw()/Cube/Sphere/Plane/
// Cone/Cylinder/Torus/kb/background/camera/frameCount/deltaTime/gravity/Group/
// ambientLight/sunLight/PointLight/SpotLight/parent/unparent/random/degrees/radians/
// distance/intersects as globals so student sketches read like q5play — just in 3D.
//
// Loaded by runner.html (which provides a <canvas id="canvas"> and the three.js
// importmap). Student sketch is injected as a separate <script> after this module
// initialises its globals.

import * as THREE from 'three';

// === SECTION: Core state ===

let _scene, _camera, _renderer, _canvas;
let _bgColor = 0x222222;
let _raf = null;

window.frameCount = 0;
window.deltaTime = 0;
let _lastTime = 0;

// === SECTION: Color helpers ===

const NAMED_COLORS = {
	white: 0xffffff, black: 0x000000, red: 0xff0000, green: 0x00ff00, blue: 0x0000ff,
	yellow: 0xffff00, cyan: 0x00ffff, magenta: 0xff00ff, gray: 0x808080, grey: 0x808080,
	orange: 0xffa500, purple: 0x800080, pink: 0xffc0cb, tomato: 0xff6347,
	deepskyblue: 0x00bfff, hotpink: 0xff69b4, limegreen: 0x32cd32, gold: 0xffd700,
	saddlebrown: 0x8b4513, crimson: 0xdc143c, brown: 0xa52a2a,
};

function parseColor(c) {
	if (typeof c === 'number') return c & 0xffffff;
	if (typeof c !== 'string') return 0xffffff;
	const s = c.trim();
	if (s.startsWith('#')) {
		let hex = s.slice(1);
		if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
		return parseInt(hex, 16) & 0xffffff;
	}
	if (s.startsWith('0x')) return parseInt(s.slice(2), 16) & 0xffffff;
	const named = NAMED_COLORS[s.toLowerCase()];
	return named !== undefined ? named : 0xffffff;
}

// === SECTION: Physics registration ===

const _physicsObjects = [];
const _grounds = [];
window.gravity = 9.8;

function _registerPhysicsShape(shape) {
	// Base physics fields (opt-in via usePhysics setter below)
	// isGround defaults false for most shapes; Plane overrides to true after construction
	Object.defineProperty(shape, 'usePhysics', {
		get() { return shape._usePhysics || false; },
		set(v) {
			if (v && !shape._usePhysics) {
				shape._usePhysics = true;
				shape.vel = { x: 0, y: 0, z: 0 };
				shape.onGround = false;
				shape.friction = 0.85;
				_physicsObjects.push(shape);
			} else if (!v && shape._usePhysics) {
				shape._usePhysics = false;
				const i = _physicsObjects.indexOf(shape);
				if (i !== -1) _physicsObjects.splice(i, 1);
			}
		},
		enumerable: true, configurable: true,
	});
	Object.defineProperty(shape, 'isGround', {
		get() { return shape._isGround || false; },
		set(v) {
			shape._isGround = !!v;
			const i = _grounds.indexOf(shape);
			if (v && i === -1) _grounds.push(shape);
			if (!v && i !== -1) _grounds.splice(i, 1);
		},
		enumerable: true, configurable: true,
	});
}

function _unregisterPhysicsShape(shape) {
	const pi = _physicsObjects.indexOf(shape);
	if (pi !== -1) _physicsObjects.splice(pi, 1);
	const gi = _grounds.indexOf(shape);
	if (gi !== -1) _grounds.splice(gi, 1);
}

// Compute bounding half-dimensions from geometry (used by AABB collision).
function _computeHalves(shape) {
	shape.mesh.geometry.computeBoundingBox();
	const bb = shape.mesh.geometry.boundingBox;
	// Scale is applied to world position but geometry bbox is in local space.
	Object.defineProperty(shape, 'halfWidth',  { get() { return (bb.max.x - bb.min.x) / 2 * shape.mesh.scale.x; }, configurable: true });
	Object.defineProperty(shape, 'halfHeight', { get() { return (bb.max.y - bb.min.y) / 2 * shape.mesh.scale.y; }, configurable: true });
	Object.defineProperty(shape, 'halfDepth',  { get() { return (bb.max.z - bb.min.z) / 2 * shape.mesh.scale.z; }, configurable: true });
}

// === SECTION: Material mixin (2.7) ===

function addMaterialProps(obj) {
	Object.defineProperties(obj, {
		metalness: {
			get() { return obj.mesh.material.metalness; },
			set(v) { obj.mesh.material.metalness = v; },
			enumerable: true, configurable: true,
		},
		roughness: {
			get() { return obj.mesh.material.roughness; },
			set(v) { obj.mesh.material.roughness = v; },
			enumerable: true, configurable: true,
		},
		wireframe: {
			get() { return obj.mesh.material.wireframe; },
			set(v) { obj.mesh.material.wireframe = v; },
			enumerable: true, configurable: true,
		},
	});
}

// === SECTION: Shapes ===

class Cube {
	constructor(x = 0, y = 0, z = 0, size = 1) {
		const geom = new THREE.BoxGeometry(size, size, size);
		const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
		this.mesh = new THREE.Mesh(geom, mat);
		this.mesh.position.set(x, y, z);
		_scene.add(this.mesh);
		addMaterialProps(this);
		_registerPhysicsShape(this);
		_computeHalves(this);
	}
	get position() { return this.mesh.position; }
	get rotation() { return this.mesh.rotation; }
	get scale() { return this.mesh.scale; }
	set color(c) { this.mesh.material.color.setHex(parseColor(c)); }
	get color() { return '#' + this.mesh.material.color.getHexString(); }
	set size(s) { this.mesh.scale.set(s, s, s); }
	remove() {
		_unregisterPhysicsShape(this);
		_scene.remove(this.mesh);
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
	}
}

class Sphere {
	constructor(x = 0, y = 0, z = 0, radius = 0.5) {
		const geom = new THREE.SphereGeometry(radius, 32, 16);
		const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
		this.mesh = new THREE.Mesh(geom, mat);
		this.mesh.position.set(x, y, z);
		_scene.add(this.mesh);
		addMaterialProps(this);
		_registerPhysicsShape(this);
		_computeHalves(this);
	}
	get position() { return this.mesh.position; }
	get rotation() { return this.mesh.rotation; }
	get scale() { return this.mesh.scale; }
	set color(c) { this.mesh.material.color.setHex(parseColor(c)); }
	get color() { return '#' + this.mesh.material.color.getHexString(); }
	set size(s) { this.mesh.scale.set(s, s, s); }
	remove() {
		_unregisterPhysicsShape(this);
		_scene.remove(this.mesh);
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
	}
}

class Plane {
	constructor(x = 0, y = 0, z = 0, width = 5, depth = 5) {
		const geom = new THREE.PlaneGeometry(width, depth);
		const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
		this.mesh = new THREE.Mesh(geom, mat);
		// Lay the plane flat on XZ so y=0 is the floor.
		this.mesh.rotation.x = -Math.PI / 2;
		this.mesh.position.set(x, y, z);
		_scene.add(this.mesh);
		addMaterialProps(this);
		_registerPhysicsShape(this);
		_computeHalves(this);
		// Planes act as ground by default.
		this.isGround = true;
	}
	get position() { return this.mesh.position; }
	get rotation() { return this.mesh.rotation; }
	get scale() { return this.mesh.scale; }
	set color(c) { this.mesh.material.color.setHex(parseColor(c)); }
	get color() { return '#' + this.mesh.material.color.getHexString(); }
	set size(s) { this.mesh.scale.set(s, s, s); }
	remove() {
		_unregisterPhysicsShape(this);
		_scene.remove(this.mesh);
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
	}
}

// === SECTION: New Primitives (2.1) ===

class Cone {
	constructor(x = 0, y = 0, z = 0, radiusBottom = 0.5, height = 1) {
		const geom = new THREE.ConeGeometry(radiusBottom, height, 32);
		const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
		this.mesh = new THREE.Mesh(geom, mat);
		this.mesh.position.set(x, y, z);
		_scene.add(this.mesh);
		addMaterialProps(this);
		_registerPhysicsShape(this);
		_computeHalves(this);
	}
	get position() { return this.mesh.position; }
	get rotation() { return this.mesh.rotation; }
	get scale() { return this.mesh.scale; }
	set color(c) { this.mesh.material.color.setHex(parseColor(c)); }
	get color() { return '#' + this.mesh.material.color.getHexString(); }
	remove() {
		_unregisterPhysicsShape(this);
		_scene.remove(this.mesh);
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
	}
}

class Cylinder {
	constructor(x = 0, y = 0, z = 0, radius = 0.5, height = 1) {
		const geom = new THREE.CylinderGeometry(radius, radius, height, 32);
		const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
		this.mesh = new THREE.Mesh(geom, mat);
		this.mesh.position.set(x, y, z);
		_scene.add(this.mesh);
		addMaterialProps(this);
		_registerPhysicsShape(this);
		_computeHalves(this);
	}
	get position() { return this.mesh.position; }
	get rotation() { return this.mesh.rotation; }
	get scale() { return this.mesh.scale; }
	set color(c) { this.mesh.material.color.setHex(parseColor(c)); }
	get color() { return '#' + this.mesh.material.color.getHexString(); }
	remove() {
		_unregisterPhysicsShape(this);
		_scene.remove(this.mesh);
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
	}
}

class Torus {
	constructor(x = 0, y = 0, z = 0, radius = 0.6, tube = 0.2) {
		const geom = new THREE.TorusGeometry(radius, tube, 16, 64);
		const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
		this.mesh = new THREE.Mesh(geom, mat);
		this.mesh.position.set(x, y, z);
		_scene.add(this.mesh);
		addMaterialProps(this);
		_registerPhysicsShape(this);
		_computeHalves(this);
	}
	get position() { return this.mesh.position; }
	get rotation() { return this.mesh.rotation; }
	get scale() { return this.mesh.scale; }
	set color(c) { this.mesh.material.color.setHex(parseColor(c)); }
	get color() { return '#' + this.mesh.material.color.getHexString(); }
	remove() {
		_unregisterPhysicsShape(this);
		_scene.remove(this.mesh);
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
	}
}

// === SECTION: Helpers (2.2, 2.3, 2.4) ===

// 2.2 random(min, max) — float in [min, max). Mirrors q5play semantics.
function random(min, max) {
	return Math.random() * (max - min) + min;
}

// 2.3 Angle conversion helpers.
function degrees(rad) { return rad * 180 / Math.PI; }
function radians(deg) { return deg * Math.PI / 180; }

// 2.4 Spatial query helpers.
function distance(a, b) {
	return a.mesh.position.distanceTo(b.mesh.position);
}

// intersects uses bounding-sphere overlap. Honest about cube-corner limits:
// works well for sphere-shaped objects; may miss corner hits on cubes.
function intersects(a, b) {
	a.mesh.geometry.computeBoundingSphere();
	b.mesh.geometry.computeBoundingSphere();
	const sa = a.mesh.geometry.boundingSphere;
	const sb = b.mesh.geometry.boundingSphere;
	const rA = sa.radius * Math.max(a.mesh.scale.x, a.mesh.scale.y, a.mesh.scale.z);
	const rB = sb.radius * Math.max(b.mesh.scale.x, b.mesh.scale.y, b.mesh.scale.z);
	return distance(a, b) < (rA + rB);
}

// === SECTION: Group (2.5) ===

class Group {
	constructor() { this._items = []; }
	add(shape) { this._items.push(shape); }
	// Defensive remove: silently no-ops if shape is not in the group.
	// Beginner refactors often call remove() twice; the no-op prevents confusion.
	remove(shape) {
		const i = this._items.indexOf(shape);
		if (i === -1) return;
		this._items.splice(i, 1);
		shape.remove();
	}
	forEach(fn) { this._items.forEach(fn); }
	filter(fn) { return this._items.filter(fn); }
	get length() { return this._items.length; }
	[Symbol.iterator]() { return this._items[Symbol.iterator](); }
}

// === SECTION: Input ===
// Mirrors q5play's kb.pressing/presses/releases. We track held keys plus
// per-frame edge sets that get cleared at end-of-frame in the render loop.

const _keys = new Set();
const _keysPressed = new Set();
const _keysReleased = new Set();

window.addEventListener('keydown', (e) => {
	if (!_keys.has(e.code)) _keysPressed.add(e.code);
	_keys.add(e.code);
});
window.addEventListener('keyup', (e) => {
	_keys.delete(e.code);
	_keysReleased.add(e.code);
});
window.addEventListener('blur', () => {
	// Forget held keys on focus loss so a key held when the iframe loses
	// focus doesn't appear stuck on next frame.
	_keys.clear();
});

function keyToCode(key) {
	if (typeof key !== 'string') return '';
	if (key.length === 1) {
		const ch = key.toUpperCase();
		if (ch >= 'A' && ch <= 'Z') return 'Key' + ch;
		if (ch >= '0' && ch <= '9') return 'Digit' + ch;
	}
	const lower = key.toLowerCase();
	if (lower === 'space' || lower === ' ') return 'Space';
	if (lower === 'enter') return 'Enter';
	if (lower === 'shift') return 'ShiftLeft';
	if (lower === 'left' || lower === 'arrowleft') return 'ArrowLeft';
	if (lower === 'right' || lower === 'arrowright') return 'ArrowRight';
	if (lower === 'up' || lower === 'arrowup') return 'ArrowUp';
	if (lower === 'down' || lower === 'arrowdown') return 'ArrowDown';
	return key;
}

const kb = {
	pressing(key) { return _keys.has(keyToCode(key)); },
	presses(key) { return _keysPressed.has(keyToCode(key)); },
	releases(key) { return _keysReleased.has(keyToCode(key)); },
};

// === SECTION: Background ===

function background(c) {
	_bgColor = parseColor(c);
	if (_scene) _scene.background = new THREE.Color(_bgColor);
}

// === SECTION: Camera (2.8) ===
// Camera modes — precedence: orbit > follow > lookAt (manual).
// Manual camera.position.x = ... and camera.lookAt(...) only take effect in manual mode.
// While follow or orbit is active, manual lookAt is silently overridden each frame.
// See lesson 3-7-reading-lookat for why camera.lookAt() appears broken during follow.

const _lookAtTarget = new THREE.Vector3(0, 0, 0);
let _followTarget = null;
let _followOffset = null;
let _orbitSpeed = 0;
let _orbitAngle = 0;

const _camHandle = {
	get position() { return _camera.position; },
	// lookAt only works in manual mode (no follow/orbit active).
	lookAt(x, y, z) {
		if (!_followTarget && !_orbitSpeed) {
			_lookAtTarget.set(x, y, z);
		}
	},
	// follow: each frame moves camera to target.position + offset; looks at target.
	follow(target, dx = 0, dy = 3, dz = 7) {
		_followTarget = target;
		_followOffset = new THREE.Vector3(dx, dy, dz);
		_orbitSpeed = 0; // follow clears orbit
	},
	clearFollow() { _followTarget = null; _followOffset = null; },
	// orbit: rotates camera around the world origin at `speed` radians/frame.
	orbit(speed = 0.01) {
		_orbitSpeed = speed;
		_followTarget = null; // orbit clears follow
	},
	clearOrbit() { _orbitSpeed = 0; },
};

// === SECTION: Lights (2.6) ===

let _ambientLight, _sunLight;

const _ambientHandle = {
	get intensity() { return _ambientLight ? _ambientLight.intensity : 0.5; },
	set intensity(v) { if (_ambientLight) _ambientLight.intensity = v; },
	get color() { return _ambientLight ? '#' + _ambientLight.color.getHexString() : '#ffffff'; },
	set color(c) { if (_ambientLight) _ambientLight.color.setHex(parseColor(c)); },
};

const _sunHandle = {
	get intensity() { return _sunLight ? _sunLight.intensity : 1.2; },
	set intensity(v) { if (_sunLight) _sunLight.intensity = v; },
	get color() { return _sunLight ? '#' + _sunLight.color.getHexString() : '#ffffff'; },
	set color(c) { if (_sunLight) _sunLight.color.setHex(parseColor(c)); },
	get position() { return _sunLight ? _sunLight.position : new THREE.Vector3(5, 10, 5); },
};

class PointLight {
	constructor(x = 0, y = 3, z = 0, color = 'white', intensity = 1) {
		this._light = new THREE.PointLight(parseColor(color), intensity, 0);
		this._light.position.set(x, y, z);
		_scene.add(this._light);
	}
	get position() { return this._light.position; }
	get intensity() { return this._light.intensity; }
	set intensity(v) { this._light.intensity = v; }
	get color() { return '#' + this._light.color.getHexString(); }
	set color(c) { this._light.color.setHex(parseColor(c)); }
	remove() { _scene.remove(this._light); }
}

class SpotLight {
	constructor(x = 0, y = 5, z = 0, color = 'white', intensity = 1) {
		this._light = new THREE.SpotLight(parseColor(color), intensity);
		this._light.position.set(x, y, z);
		_scene.add(this._light);
	}
	get position() { return this._light.position; }
	get intensity() { return this._light.intensity; }
	set intensity(v) { this._light.intensity = v; }
	get color() { return '#' + this._light.color.getHexString(); }
	set color(c) { this._light.color.setHex(parseColor(c)); }
	remove() { _scene.remove(this._light); }
}

// === SECTION: Parenting (2.12) ===
// NOTE: parent() shadows window.parent (DOM parent frame) intentionally.
// shPlay sketches run in an iframe where window.parent is not used in student code.

function parent(child, parentObj) {
	parentObj.mesh.add(child.mesh);
}

function unparent(child) {
	if (child.mesh.parent && child.mesh.parent !== _scene) {
		const worldPos = new THREE.Vector3();
		child.mesh.getWorldPosition(worldPos);
		child.mesh.parent.remove(child.mesh);
		_scene.add(child.mesh);
		child.mesh.position.copy(worldPos);
	}
}

// === SECTION: Boot + render loop ===

function spawnDefaults() {
	_scene = new THREE.Scene();
	_scene.background = new THREE.Color(_bgColor);

	const aspect = (_canvas.clientWidth || 1) / (_canvas.clientHeight || 1);
	_camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
	_camera.position.set(0, 3, 7);
	_camera.lookAt(0, 0, 0);

	_ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	_scene.add(_ambientLight);

	_sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
	_sunLight.position.set(5, 10, 5);
	_scene.add(_sunLight);
}

function resize() {
	const w = _canvas.clientWidth || _canvas.width;
	const h = _canvas.clientHeight || _canvas.height;
	if (w === 0 || h === 0) return;
	_renderer.setSize(w, h, false);
	_camera.aspect = w / h;
	_camera.updateProjectionMatrix();
}

function postStatus(text, ok = true) {
	try { window.parent.postMessage({ source: 'shplay-status', text, ok }, '*'); } catch {}
}

function frame(timestamp) {
	// 2.9 deltaTime — capped at 0.1 so paused-tab spikes don't explode physics.
	const dt = _lastTime === 0 ? 0 : Math.min((timestamp - _lastTime) / 1000, 0.1);
	_lastTime = timestamp;
	window.deltaTime = dt;
	window.frameCount++;

	// 2.10 Physics tick — runs BEFORE student draw() so draw() sees updated positions.
	// Step 1: apply gravity to vertical velocity
	for (const s of _physicsObjects) {
		s.vel.y -= window.gravity * dt;
	}
	// Step 2: integrate velocity into position
	for (const s of _physicsObjects) {
		s.position.x += s.vel.x * dt;
		s.position.y += s.vel.y * dt;
		s.position.z += s.vel.z * dt;
	}
	// Step 3: AABB ground-collision pass (only when falling or stationary vertically)
	for (const s of _physicsObjects) {
		s.onGround = false;
		if (s.vel.y > 0) continue; // skip upward-moving objects
		for (const g of _grounds) {
			if (s === g) continue;
			const sBottom = s.position.y - s.halfHeight;
			const gTop = g.position.y + g.halfHeight;
			if (sBottom <= gTop) {
				const xOk = Math.abs(s.position.x - g.position.x) <= (g.halfWidth + s.halfWidth);
				const zOk = Math.abs(s.position.z - g.position.z) <= (g.halfDepth + s.halfDepth);
				if (xOk && zOk) {
					s.position.y = gTop + s.halfHeight;
					s.vel.y = 0;
					s.onGround = true;
					break; // first-hit wins
				}
			}
		}
	}
	// Step 4: friction — damp horizontal velocity when on ground
	for (const s of _physicsObjects) {
		if (s.onGround) {
			s.vel.x *= s.friction;
			s.vel.z *= s.friction;
		}
	}

	// 2.8 Camera mode precedence: orbit > follow > lookAt
	if (_orbitSpeed) {
		_orbitAngle += _orbitSpeed;
		const camPos = _camera.position;
		const r = Math.sqrt(camPos.x * camPos.x + camPos.z * camPos.z) || 7;
		_camera.position.x = Math.sin(_orbitAngle) * r;
		_camera.position.z = Math.cos(_orbitAngle) * r;
		_camera.lookAt(0, 0, 0);
	} else if (_followTarget) {
		const tp = _followTarget.mesh.position;
		_camera.position.set(
			tp.x + _followOffset.x,
			tp.y + _followOffset.y,
			tp.z + _followOffset.z,
		);
		_camera.lookAt(tp);
	} else {
		_camera.lookAt(_lookAtTarget);
	}

	// Student draw()
	if (typeof window.draw === 'function') {
		try { window.draw(); }
		catch (e) { console.error('draw() error:', e); }
	}

	_renderer.render(_scene, _camera);
	_keysPressed.clear();
	_keysReleased.clear();
	// Heartbeat once per second so the parent can show "running · frame N".
	if (window.frameCount % 60 === 0) postStatus(`running · frame ${window.frameCount}`);
	_raf = requestAnimationFrame(frame);
}

export async function boot() {
	postStatus('booting…');
	_canvas = document.getElementById('canvas');
	if (!_canvas) {
		postStatus('boot failed: no <canvas id="canvas">', false);
		throw new Error('shPlay: no <canvas id="canvas"> found in the page.');
	}

	try {
		_renderer = new THREE.WebGLRenderer({ canvas: _canvas, antialias: true });
		_renderer.setPixelRatio(window.devicePixelRatio);
	} catch (e) {
		postStatus('boot failed: WebGL not available', false);
		throw e;
	}

	spawnDefaults();
	resize();
	new ResizeObserver(resize).observe(_canvas);

	if (typeof window.setup === 'function') {
		try { window.setup(); }
		catch (e) { console.error('setup() error:', e); }
	}
	postStatus('running · frame 0');
	_raf = requestAnimationFrame(frame);
}

// === SECTION: Dispose listener ===
// Listens for { source: 'shplay-host', type: 'dispose' } from the React component
// on unmount. Frees the WebGL context immediately to avoid Chrome's ~16-context cap.
window.addEventListener('message', (e) => {
	if (e.data?.source === 'shplay-host' && e.data?.type === 'dispose') {
		if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
		if (_renderer) { _renderer.dispose(); }
		if (_scene) { _scene.clear(); }
	}
});

// === SECTION: Globals ===

window.Cube = Cube;
window.Sphere = Sphere;
window.Plane = Plane;
window.Cone = Cone;
window.Cylinder = Cylinder;
window.Torus = Torus;
window.random = random;
window.degrees = degrees;
window.radians = radians;
window.distance = distance;
window.intersects = intersects;
window.Group = Group;
window.ambientLight = _ambientHandle;
window.sunLight = _sunHandle;
window.PointLight = PointLight;
window.SpotLight = SpotLight;
window.parent = parent;
window.unparent = unparent;
window.kb = kb;
window.background = background;
window.camera = _camHandle;
window.shplay = { boot };
// gravity is set at module level: window.gravity = 9.8
// deltaTime is updated each frame: window.deltaTime
