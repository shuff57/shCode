// shPlay — beginner-friendly 3D facade over three.js, in the spirit of q5play.
// Hand-written ES module, no build step. Exposes setup()/draw()/Cube/Sphere/Plane/
// kb/background/camera/frameCount as globals so student sketches read like q5play
// — just in three dimensions.
//
// Loaded by runner.html (which provides a <canvas id="canvas"> and the three.js
// importmap). Student sketch is injected as a separate <script> after this module
// initializes its globals.

import * as THREE from 'three';

let _scene, _camera, _renderer, _canvas;
let _bgColor = 0x222222;

window.frameCount = 0;

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
		// Expand #RGB shorthand to #RRGGBB.
		if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
		return parseInt(hex, 16) & 0xffffff;
	}
	if (s.startsWith('0x')) return parseInt(s.slice(2), 16) & 0xffffff;
	const named = NAMED_COLORS[s.toLowerCase()];
	return named !== undefined ? named : 0xffffff;
}

class Cube {
	constructor(x = 0, y = 0, z = 0, size = 1) {
		const geom = new THREE.BoxGeometry(size, size, size);
		const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
		this.mesh = new THREE.Mesh(geom, mat);
		this.mesh.position.set(x, y, z);
		_scene.add(this.mesh);
	}
	get position() { return this.mesh.position; }
	get rotation() { return this.mesh.rotation; }
	get scale() { return this.mesh.scale; }
	set color(c) { this.mesh.material.color.setHex(parseColor(c)); }
	get color() { return '#' + this.mesh.material.color.getHexString(); }
	set size(s) { this.mesh.scale.set(s, s, s); }
	remove() { _scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

class Sphere {
	constructor(x = 0, y = 0, z = 0, radius = 0.5) {
		const geom = new THREE.SphereGeometry(radius, 32, 16);
		const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
		this.mesh = new THREE.Mesh(geom, mat);
		this.mesh.position.set(x, y, z);
		_scene.add(this.mesh);
	}
	get position() { return this.mesh.position; }
	get rotation() { return this.mesh.rotation; }
	get scale() { return this.mesh.scale; }
	set color(c) { this.mesh.material.color.setHex(parseColor(c)); }
	get color() { return '#' + this.mesh.material.color.getHexString(); }
	set size(s) { this.mesh.scale.set(s, s, s); }
	remove() { _scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

class Plane {
	constructor(x = 0, y = 0, z = 0, width = 5, depth = 5) {
		const geom = new THREE.PlaneGeometry(width, depth);
		const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
		this.mesh = new THREE.Mesh(geom, mat);
		// Default: lay the plane flat on XZ (so y=0 is the floor).
		this.mesh.rotation.x = -Math.PI / 2;
		this.mesh.position.set(x, y, z);
		_scene.add(this.mesh);
	}
	get position() { return this.mesh.position; }
	get rotation() { return this.mesh.rotation; }
	get scale() { return this.mesh.scale; }
	set color(c) { this.mesh.material.color.setHex(parseColor(c)); }
	get color() { return '#' + this.mesh.material.color.getHexString(); }
	remove() { _scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

// --- Input ---------------------------------------------------------------
// Mirrors q5play's kb.pressing/presses/releases. We track held keys plus
// per-frame edge sets that get cleared at end-of-frame in our render loop.

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

// --- Background + camera helpers ----------------------------------------

function background(c) {
	_bgColor = parseColor(c);
	if (_scene) _scene.background = new THREE.Color(_bgColor);
}

// Friendly camera handle exposed as a global. .position / .lookAt(x,y,z)
// translate to the underlying three.js camera. lookAt is sticky — the camera
// keeps facing the last lookAt target every frame.
const _camHandle = {
	get position() { return _camera.position; },
	lookAt(x, y, z) { _lookAtTarget.set(x, y, z); _camera.lookAt(_lookAtTarget); },
};
const _lookAtTarget = new THREE.Vector3(0, 0, 0);

// --- Boot + render loop -------------------------------------------------

function spawnDefaults() {
	_scene = new THREE.Scene();
	_scene.background = new THREE.Color(_bgColor);

	const aspect = (_canvas.clientWidth || 1) / (_canvas.clientHeight || 1);
	_camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
	_camera.position.set(0, 3, 7);
	_camera.lookAt(0, 0, 0);

	const ambient = new THREE.AmbientLight(0xffffff, 0.5);
	_scene.add(ambient);

	const sun = new THREE.DirectionalLight(0xffffff, 1.2);
	sun.position.set(5, 10, 5);
	_scene.add(sun);
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

function frame() {
	window.frameCount++;
	if (typeof window.draw === 'function') {
		try { window.draw(); }
		catch (e) { console.error('draw() error:', e); }
	}
	_renderer.render(_scene, _camera);
	_keysPressed.clear();
	_keysReleased.clear();
	// Heartbeat — once per second, so the parent can show "running · frame N".
	if (window.frameCount % 60 === 0) postStatus(`running · frame ${window.frameCount}`);
	requestAnimationFrame(frame);
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
	requestAnimationFrame(frame);
}

// --- Globals -------------------------------------------------------------

window.Cube = Cube;
window.Sphere = Sphere;
window.Plane = Plane;
window.kb = kb;
window.background = background;
window.camera = _camHandle;
window.shplay = { boot };
