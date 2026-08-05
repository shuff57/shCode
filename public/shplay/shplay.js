/* teaching-engine.js — q5play-style API spike, physics via planck.js (Box2D).
 *
 * Goal: prove we can reimplement the exact API surface Q2 of the curriculum
 * already teaches, license-clean (our facade is MIT; planck.js is MIT, a
 * pure-JS/TS rewrite of Box2D by Ali Shakiba — vendored in vendor/planck.min.js).
 *
 * Facade — the student-facing API (audited exhaustively against all 86 real
 * lessons/.../script.js + solution.js, plus content.md/lesson.json prose):
 *   new Canvas(w, h)          setup()/update()/draw() hooks
 *   new Sprite(x,y[,w,h[,bodyType]])   (x,y,d) is a circle; (x,y) is 50x50
 *                             .pos .vel .color .rotation .layer .shape .scale
 *                             .body / .collider ('dynamic'|'static'|'kinematic'|'none' sensor)
 *                             .diameter .visible .stroke .strokeWeight
 *                             .bounciness .friction .applyForce
 *                             .overlaps(other[, cb]) .colliding(other) .delete()/.remove()
 *   new Group()               array-like, shared property defaults,
 *                             new groupName.Sprite(...) factory (W10)
 *   allSprites                implicit group every sprite auto-joins
 *   kb.pressing('left')       kb.presses('space')   (edge-triggered)
 *   mouse.x/y                 mouse.pressing()  mouse.presses()  (edge)
 *   world.gravity.y           frameCount        world.getSpriteAt(x,y)
 *   background(color)         camera.x / camera.y
 *   fill(c) textSize(px) textAlign(CENTER|LEFT|RIGHT)   text(str,x,y)
 *   square(x,y,s)  cos/sin  mouseX/mouseY  width/height  noLoop()
 *   storeItem/getItem         (localStorage)
 *   sprite.addAni/changeAni   (2.4.x minimal sprite-sheet animation)
 *   sprite.image = url        (still image; a string with no '.' is an emoji
 *                             placeholder instead of a URL, e.g. '🧍')
 *   new HingeJoint(a,b,opt)   new DistanceJoint(a,b,opt)   joint.delete()
 *   new SliderJoint(a,b,opt)  new WheelJoint(a,b,opt)  new GrabberJoint(a,b,opt)
 *   new GlueJoint(a,b)        joint.length (DistanceJoint, settable post-construction)
 *
 * Physics: REAL Box2D (via planck.js), not arcade.
 *   - Stacking, sleeping, actual circle colliders, joints (W17) all work.
 *   - Units: the FACADE speaks pixels-per-frame (vel.x=4 → 240 px/s at 60fps,
 *     matching what Q2 teaches and A10.2 asks students to compute). The adapter
 *     converts to Box2D meters behind the scenes.
 *   - `overlaps()` is a manual bounding-box query (sensor-style, for
 *     `collider = 'none'` sprites). `colliding()` reads planck's real contact
 *     list (solid-body physics contact) — they are NOT aliases of each other.
 *
 * SCOPE (2D only — 3D is out of scope by design): see bottom of this header.
 */

(function (global) {
  'use strict';

  if (!global.planck) {
    throw new Error('planck.js missing — include vendor/planck.min.js before engine.js');
  }
  const pl = global.planck;

  // Pixels per Box2D meter. 30px = 1m keeps world objects human-sized.
  const PXM = 30;
  const FPS = 60;

  // ---- globals every sketch sees ---------------------------------------

  let CANVAS_ = null;    // HTMLCanvasElement
  let CTX_ = null;       // 2d context
  let W_ = 0, H_ = 0;

  let FRAME_ = 0;
  let ALL_ = [];         // all sprites, in creation order
  let WORLD_ = null;     // planck World, lazily created
  let JOINTS_ = [];      // all joints, so they survive sprite GC

  // ---- input state ------------------------------------------------------

  const KEYS_DOWN = {};
  const KEYS_PRESSED = {};
  const MOUSE = { x: 0, y: 0, _down: false, _pressed: false, _released: false };

  const kb = {
    pressing: (k) => !!KEYS_DOWN[k],
    presses: (k) => !!KEYS_PRESSED[k],
  };
  const mouse = {
    get x() { return MOUSE.x; },
    get y() { return MOUSE.y; },
    pressing: () => MOUSE._down,
    presses: () => MOUSE._pressed,
    released: () => MOUSE._released,
  };

  // world.gravity in pixels/frame² → Box2D m/s² on write, px/frame² on read.
  const world = {};
  Object.defineProperty(world, 'gravity', {
    get() { const g = _world().getGravity(); return { x: g.x * PXM / (FPS * FPS), y: g.y * PXM / (FPS * FPS) }; },
    set(v) { _world().setGravity(pl.Vec2(v.x * FPS * FPS / PXM, v.y * FPS * FPS / PXM)); },
  });

  const camera = { x: 0, y: 0 };

  // ---- canvas -----------------------------------------------------------

  class Canvas {
    constructor(w, h) {
      W_ = w; H_ = h;
      CANVAS_ = document.createElement('canvas');
      CANVAS_.width = w; CANVAS_.height = h;
      CTX_ = CANVAS_.getContext('2d');
      document.body.appendChild(CANVAS_);
    }
  }

  function background(color) {
    CTX_.save();
    CTX_.translate(-camera.x, -camera.y);
    CTX_.fillStyle = color;
    CTX_.fillRect(camera.x, camera.y, W_, H_);
    CTX_.restore();
  }

  function _world() {
    if (!WORLD_) WORLD_ = pl.World({ gravity: pl.Vec2(0, 9.8) });
    return WORLD_;
  }

  // ---- sprite -----------------------------------------------------------

  // A live vector: reads/writes the underlying Box2D body on every axis access,
  // so `player.vel.x = 3` and `player.pos.y += 5` work exactly like q5play.
  function liveVec(read, write) {
    return {
      get x() { return read().x; },
      get y() { return read().y; },
      set x(v) { const c = read(); write(v, c.y); },
      set y(v) { const c = read(); write(c.x, v); },
    };
  }

  class Sprite {
    constructor(x, y, w, h, bodyType) {
      // Real q5play constructor-argument dispatch, matched to actual lesson
      // call shapes (audited across all 86 real script.js/solution.js):
      //   new Sprite(x, y)             -> 50x50 square (group-factory shorthand)
      //   new Sprite(x, y, d)          -> circle, diameter d (2.2.6 lab)
      //   new Sprite(x, y, w, h)       -> rect
      //   new Sprite(x, y, w, h, type) -> rect + bodyType ('static'|'kinematic'|'dynamic')
      let isCircle = false;
      if (w !== undefined && h === undefined) { isCircle = true; h = w; }
      else if (w === undefined) { w = 50; h = 50; }

      this._body = _world().createBody({ type: 'dynamic', position: pl.Vec2(x / PXM, y / PXM) });
      this._body.setUserData(this);

      this.w = w;
      this.h = h;
      this.color = 'deeppink';
      this.layer = 0;
      this.visible = true;
      this.scale = { x: 1, y: 1 };
      this.stroke = null;
      this.strokeWeight = 1;
      this.ani = null;
      this._anis = null;
      this._img = null;
      this._emoji = null;
      this._groups = []; // every Group this sprite currently belongs to (incl. allSprites)

      // raw physics knobs — getters/setters below rebuild the fixture on change
      this._shape = isCircle ? 'circle' : 'rect';
      this._bodyType = bodyType || 'dynamic';
      this._sensor = false; // true when collider = 'none' (sensor, no collision response)
      this._bounciness = 0;
      this._friction = 0;
      this._buildFixture();

      this.pos = liveVec(
        () => { const p = this._body.getPosition(); return { x: p.x * PXM, y: p.y * PXM }; },
        (x, y) => this._body.setPosition(pl.Vec2(x / PXM, y / PXM)),
      );
      this.vel = liveVec(
        () => { const v = this._body.getLinearVelocity(); return { x: v.x * PXM / FPS, y: v.y * PXM / FPS }; },
        (x, y) => this._body.setLinearVelocity(pl.Vec2(x * FPS / PXM, y * FPS / PXM)),
      );

      ALL_.push(this);
      allSprites.push(this);
    }

    _buildFixture() {
      if (this._fixture) { this._body.destroyFixture(this._fixture); }
      const r = (this._shape === 'circle' ? this.w : this.w) / 2 / PXM;
      const hw = this.w / 2 / PXM;
      const hh = this.h / 2 / PXM;
      const shape = this._shape === 'circle' ? pl.Circle(r) : pl.Box(hw, hh);
      const fd = {
        shape,
        density: this._bodyType === 'dynamic' ? 1 : 0,
        friction: this._friction,
        restitution: this._bounciness,
        isSensor: !!this._sensor,
      };
      this._fixture = this._body.createFixture(fd);
      this._body.setType(this._bodyType);
    }

    get shape() { return this._shape; }
    set shape(s) { this._shape = s; this._buildFixture(); }
    get body() { return this._bodyType; }
    set body(t) { this._bodyType = t; this._buildFixture(); }
    get bounciness() { return this._bounciness; }
    set bounciness(v) { this._bounciness = v; this._buildFixture(); }
    get friction() { return this._friction; }
    set friction(v) { this._friction = v; this._buildFixture(); }

    // sensor/collider concept (2.3.x): 'none' = passes through everything,
    // detectable only via overlaps() (bounding box); 'static'/'kinematic'/
    // 'dynamic' behave exactly like the .body property (they're the same
    // underlying bodyType — collider is just the taught name for it).
    get collider() { return this._sensor ? 'none' : this._bodyType; }
    set collider(v) {
      if (v === 'none') { this._sensor = true; }
      else { this._sensor = false; this._bodyType = v; }
      this._buildFixture();
    }

    // shorthand size setter for circular sprites (group default + per-sprite,
    // e.g. `apples.diameter = 20`, `leftWheel.diameter = 20`).
    get diameter() { return this.w; }
    set diameter(v) { this.w = v; this.h = v; this._shape = 'circle'; this._buildFixture(); }

    // still art — mutually exclusive with an active `ani` (2.4.3d).
    // A string with no '.' is treated as an emoji/text placeholder rather
    // than an image URL (matches real q5play's `img` setter heuristic —
    // exercised by real lesson code, e.g. `player.image = '🧍'`).
    get image() { return this._img || this._emoji; }
    set image(url) {
      if (typeof url === 'string' && !url.includes('.')) {
        this._emoji = url;
        this._img = null;
      } else {
        this._img = new Image();
        this._img.src = url;
        this._emoji = null;
      }
      this.ani = null;
    }

    // minimal sprite-sheet animation (2.4.3a–2.4.3c): a named animation is a
    // horizontal frame-strip; only one is "active" (this.ani) at a time.
    addAni(name, sheetUrl, frameCount) {
      const ani = new Ani(name, sheetUrl, frameCount);
      if (!this._anis) this._anis = new Anis();
      this._anis[name] = ani;
      if (!this.ani) this.ani = ani; // first addAni auto-activates
      this._img = null; // mutually exclusive with a still `.image` (2.4.3d)
      this._emoji = null;
      return ani;
    }

    changeAni(name) {
      const ani = this._anis && this._anis[name];
      if (!ani) return; // unregistered name — silent no-op, matches q5play
      this.ani = ani;
    }

    get x() { return this.pos.x; }
    set x(v) { this.pos.x = v; }
    get y() { return this.pos.y; }
    set y(v) { this.pos.y = v; }

    get rotation() { return (this._body.getAngle() * 180) / Math.PI; }
    set rotation(deg) { this._body.setAngle((deg * Math.PI) / 180); }

    // angularVelocity — degrees per frame, matching the facade's px/frame unit
    // convention (2.3.19 pendulum kick, 2.3.21 car-ramp wheel drive).
    get angularVelocity() { return ((this._body.getAngularVelocity() * 180) / Math.PI) / FPS; }
    set angularVelocity(degPerFrame) { this._body.setAngularVelocity((degPerFrame * Math.PI / 180) * FPS); }

    applyForce(fx, fy) {
      // facade units: accelerate like gravity f px/frame² at mass 1
      const m = this._body.getMass();
      const a = FPS * FPS / PXM;
      this._body.applyForceToCenter(pl.Vec2(fx * m * a, fy * m * a), true);
    }

    _bounds() {
      const w = this._shape === 'circle' ? this.w : this.w;
      const h = this._shape === 'circle' ? this.w : this.h;
      return { l: this.x - w / 2, r: this.x + w / 2, t: this.y - h / 2, b: this.y + h / 2 };
    }

    // boolean form: `sprite.overlaps(other)`. Also accepts a Group — true if
    // ANY member overlaps — and the callback form `overlaps(group, cb)`,
    // which fires `cb(self, other)` once per overlapping pair, after this
    // method has finished its own iteration (safe to delete() inside cb).
    overlaps(other, cb) {
      if (other instanceof Group) {
        let hit = false;
        for (const s of [...other]) {
          if (s === this) continue;
          if (this._overlapsOne(s)) {
            hit = true;
            if (cb) cb(this, s);
          }
        }
        return hit;
      }
      return this._overlapsOne(other);
    }

    _overlapsOne(other) {
      const a = this._bounds(), b = other._bounds();
      return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
    }

    // solid-body physics contact (2.3.17) — truthy (a running frame count)
    // while actually touching `other` (or, if `other` is a Group, the
    // longest-touching member). Backed by planck's real contact list, not
    // the manual bounding-box math `overlaps()` uses — see _updateContacts().
    colliding(other) {
      if (other instanceof Group) {
        let count = 0;
        for (const s of other) count = Math.max(count, (this._touch && this._touch.get(s)) || 0);
        return count;
      }
      return (this._touch && this._touch.get(other)) || 0;
    }

    // Full destruction: tears down the physics body and removes this sprite
    // from every group it belongs to (including the implicit allSprites) —
    // matches the real `sprite.delete()` contract (2.3.3/2.3.7/2.3.8).
    delete() {
      this._dead = true;
      _world().destroyBody(this._body);
      for (const g of this._groups.slice()) {
        const i = g.indexOf(this);
        if (i >= 0) g.splice(i, 1);
      }
      this._groups.length = 0;
    }

    // `sprite.remove()` is used interchangeably with `delete()` in real
    // lesson code (e.g. 2.6.11, 2.6.13) — same full-destroy behavior.
    remove() { this.delete(); }

    _draw() {
      if (!this.visible) return;
      CTX_.save();
      CTX_.translate(this.x, this.y);
      CTX_.rotate((this.rotation * Math.PI) / 180);
      CTX_.scale(this.scale.x, this.scale.y);
      if (this.ani && this.ani.spriteSheet.complete) {
        const img = this.ani.spriteSheet;
        const fw = img.naturalWidth / this.ani.frameCount;
        CTX_.drawImage(img, this.ani.frame * fw, 0, fw, img.naturalHeight, -this.w / 2, -this.h / 2, this.w, this.h);
      } else if (this._img && this._img.complete) {
        CTX_.drawImage(this._img, -this.w / 2, -this.h / 2, this.w, this.h);
      } else if (this._emoji) {
        CTX_.font = `${this.h}px sans-serif`;
        CTX_.textAlign = 'center';
        CTX_.textBaseline = 'middle';
        CTX_.fillText(this._emoji, 0, 0);
      } else if (!this.ani && !this._img) {
        CTX_.fillStyle = this.color;
        if (this.shape === 'circle') {
          CTX_.beginPath();
          CTX_.arc(0, 0, this.w / 2, 0, Math.PI * 2);
          CTX_.fill();
          if (this.stroke) { CTX_.strokeStyle = this.stroke; CTX_.lineWidth = this.strokeWeight; CTX_.stroke(); }
        } else {
          CTX_.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
          if (this.stroke) { CTX_.strokeStyle = this.stroke; CTX_.lineWidth = this.strokeWeight; CTX_.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h); }
        }
      }
      CTX_.restore();
    }
  }

  // ---- animation (2.4.x) --------------------------------------------------
  // Minimal sprite-sheet animation: a named horizontal frame-strip, advanced
  // on a fixed delay. Not q5play's full texture-atlas system (no multi-row
  // atlases, no addAnis) — real lesson code only ever calls addAni/changeAni.

  class Ani {
    constructor(name, sheetUrl, frameCount) {
      this.name = name;
      this.frameCount = frameCount || 1;
      this.frameDelay = 4; // game frames per animation frame (q5play default)
      this.frame = 0;
      this._tick = 0;
      this.spriteSheet = new Image();
      this.spriteSheet.src = sheetUrl;
    }
    _advance() {
      if (this.frameCount <= 1) return;
      if (++this._tick < this.frameDelay) return;
      this._tick = 0;
      this.frame = (this.frame + 1) % this.frameCount;
    }
  }

  // Per-sprite named-animation registry (`sprite.addAni` fills it in).
  class Anis {}

  // ---- group ------------------------------------------------------------

  class Group extends Array {
    constructor(props) {
      super();
      if (props) Object.assign(this, props);

      // `new groupName.Sprite(...)` factory (2.3.3): a sprite subclass bound to
      // this group instance that copies the group's current own properties on
      // as defaults, then joins the group. Defined non-enumerable so it never
      // shows up in the default-property copy loop below (or in `Object.keys`
      // on the group, which would otherwise see it as a spurious "default").
      const group = this;
      class GroupSprite extends Sprite {
        constructor(...args) {
          super(...args);
          for (const key of Object.keys(group)) {
            if (/^\d+$/.test(key)) continue; // array indices = existing members, not defaults
            this[key] = group[key];
          }
          group.push(this);
        }
      }
      Object.defineProperty(this, 'Sprite', { value: GroupSprite, enumerable: false });
    }
    newSprite(x, y, w, h) { const s = new Sprite(x, y, w, h); this.push(s); return s; }

    // Track membership on every sprite pushed in, however it gets here
    // (direct `.push()`, `.newSprite()`, or the `.Sprite` factory above) —
    // `sprite.delete()` needs to know every group to unparent itself from.
    push(...sprites) {
      for (const s of sprites) {
        if (s && s._groups && !s._groups.includes(this)) s._groups.push(this);
      }
      return super.push(...sprites);
    }

    // `group.remove(sprite)` only unparents — the sprite keeps existing,
    // drawing, and running physics. Use `sprite.delete()` to destroy it
    // (2.3.3/2.3.7: "group.remove(sprite) only unparents; there is no
    // sprite.remove() on Group" — a real, documented distinction this
    // engine previously got wrong by destroying on group.remove()).
    remove(s) {
      const i = this.indexOf(s);
      if (i >= 0) this.splice(i, 1);
      if (s && s._groups) {
        const gi = s._groups.indexOf(this);
        if (gi >= 0) s._groups.splice(gi, 1);
      }
    }
    overlaps(other, cb) { return this.some((s) => s.overlaps(other, cb)); }
  }

  // Implicit group every sprite auto-joins on creation (2.3.7: "removes it
  // from every group it belongs to, including the implicit allSprites").
  // Real usage: `player.colliding(allSprites)` (2.4.10 platformer) to test
  // against "anything", not one specific ground sprite/group.
  const allSprites = new Group();

  // spatial hit-test (2.7.6): top-most (highest layer) live sprite at a point,
  // or undefined. `x`/`y` are world coords, same space as mouse.x/y and sprite.x/y.
  world.getSpriteAt = function (x, y) {
    const hits = ALL_.filter((s) => {
      if (s._dead) return false;
      if (s.shape === 'circle') {
        const dx = x - s.x, dy = y - s.y;
        return dx * dx + dy * dy <= (s.w / 2) ** 2;
      }
      const b = s._bounds();
      return x >= b.l && x <= b.r && y >= b.t && y <= b.b;
    });
    if (!hits.length) return undefined;
    hits.sort((a, b) => a.layer - b.layer);
    return hits[hits.length - 1];
  };

  // ---- joints (W17) — thin facades over planck joints ---------------------

  function _anchor(a, b, opt) {
    // opt.anchor is in facade pixels (world coords); planck wants local anchors.
    const ax = (opt && opt.anchor && opt.anchor.x) || (a.x);
    const ay = (opt && opt.anchor && opt.anchor.y) || (a.y);
    const localA = a._body.getLocalPoint(pl.Vec2(ax / PXM, ay / PXM));
    const localB = b._body.getLocalPoint(pl.Vec2(ax / PXM, ay / PXM));
    return { localA, localB };
  }

  // Shared by every joint facade: `joint.delete()` releases the constraint
  // at runtime (2.7.16/2.7.21/2.7.26 — "there is no joint.remove()", only
  // delete()). Each subclass constructor sets `this._joint` before use.
  class Joint {
    delete() {
      _world().destroyJoint(this._joint);
      const i = JOINTS_.indexOf(this._joint);
      if (i >= 0) JOINTS_.splice(i, 1);
    }
  }

  class HingeJoint extends Joint {
    constructor(a, b, opt) {
      super();
      const { localA, localB } = _anchor(a, b, opt);
      this._joint = _world().createJoint(new pl.RevoluteJoint({ localAnchorA: localA, localAnchorB: localB }, a._body, b._body));
      JOINTS_.push(this._joint);
    }
  }
  class DistanceJoint extends Joint {
    constructor(a, b, opt) {
      super();
      const { localA, localB } = _anchor(a, b, opt);
      const dx = b.x - a.x, dy = b.y - a.y;
      const sep = Math.sqrt(dx * dx + dy * dy) / PXM;
      const len = (opt && opt.length) ? opt.length / PXM : sep;
      this._joint = _world().createJoint(new pl.DistanceJoint({ length: len, localAnchorA: localA, localAnchorB: localB }, a._body, b._body));
      JOINTS_.push(this._joint);
    }
    // settable after construction (2.7.12/2.7.26: "set joint length after
    // construction" — `new DistanceJoint(a, b)` then `joint.length = 100`).
    get length() { return this._joint.getLength() * PXM; }
    set length(v) { this._joint.setLength(v / PXM); }
  }
  class SliderJoint extends Joint {
    constructor(a, b, opt) {
      super();
      const { localA, localB } = _anchor(a, b, opt);
      const axis = (opt && opt.axis) ? pl.Vec2(opt.axis.x, opt.axis.y) : pl.Vec2(1, 0);
      this._joint = _world().createJoint(new pl.PrismaticJoint({ localAnchorA: localA, localAnchorB: localB, localAxisA: axis }, a._body, b._body));
      JOINTS_.push(this._joint);
    }
  }
  class WheelJoint extends Joint {
    constructor(a, b, opt) {
      super();
      const { localA, localB } = _anchor(a, b, opt);
      const axis = (opt && opt.axis) ? pl.Vec2(opt.axis.x, opt.axis.y) : pl.Vec2(1, 0);
      this._joint = _world().createJoint(new pl.WheelJoint({ localAnchorA: localA, localAnchorB: localB, localAxisA: axis }, a._body, b._body));
      JOINTS_.push(this._joint);
    }
  }
  class GrabberJoint extends Joint {
    constructor(a, b, opt) {
      super();
      // a = anchor body (usually static), b = dragged sprite
      const ax = (opt && opt.anchor && opt.anchor.x) || b.x;
      const ay = (opt && opt.anchor && opt.anchor.y) || b.y;
      const localA = a._body.getLocalPoint(pl.Vec2(ax / PXM, ay / PXM));
      const localB = b._body.getLocalPoint(pl.Vec2(ax / PXM, ay / PXM));
      const maxF = (opt && opt.maxForce) || 100;
      this._joint = _world().createJoint(new pl.MouseJoint({ maxForce: maxF, target: pl.Vec2(ax / PXM, ay / PXM), localAnchorA: localA, localAnchorB: localB }, a._body, b._body));
      JOINTS_.push(this._joint);
    }
  }
  class GlueJoint extends Joint {
    // Ported from the real q5play GlueJoint (public/q5play/q5play.js ~5552):
    // a WeldJoint rigidly fusing a and b at their CURRENT relative pose,
    // anchored at spriteA's position. No `opt` — q5play's GlueJoint takes
    // only (spriteA, spriteB), unlike this file's other joints.
    constructor(a, b) {
      super();
      const worldAnchor = pl.Vec2(a.x / PXM, a.y / PXM);
      const localA = a._body.getLocalPoint(worldAnchor);
      const localB = b._body.getLocalPoint(worldAnchor);
      const referenceAngle = b._body.getAngle() - a._body.getAngle();
      this._joint = _world().createJoint(new pl.WeldJoint({ localAnchorA: localA, localAnchorB: localB, referenceAngle }, a._body, b._body));
      JOINTS_.push(this._joint);
    }
  }

  // ---- physics step -----------------------------------------------------

  function stepPhysics() {
    _world().step(1 / FPS, 8, 3);
  }

  // sprite.colliding() (2.3.17) needs real physics contacts, not bounding
  // boxes — walk planck's live contact list every frame and keep a running
  // per-pair frame count on each sprite, reset the instant a pair separates.
  function _updateContacts() {
    const now = new Map(); // sprite -> Set(other sprites touching this frame)
    for (let c = _world().getContactList(); c; c = c.getNext()) {
      if (!c.isTouching()) continue;
      // Sensor fixtures (collider = 'none') still show up as "touching" in
      // planck's contact list (only the solver skips their impulse) — but
      // colliding() is documented as solid-body contact only (2.3.17), so
      // a sensor pair must never count here even though overlaps() sees it.
      if (c.getFixtureA().isSensor() || c.getFixtureB().isSensor()) continue;
      const a = c.getFixtureA().getBody().getUserData();
      const b = c.getFixtureB().getBody().getUserData();
      if (!(a instanceof Sprite) || !(b instanceof Sprite)) continue;
      if (!now.has(a)) now.set(a, new Set());
      if (!now.has(b)) now.set(b, new Set());
      now.get(a).add(b);
      now.get(b).add(a);
    }
    for (const s of ALL_) {
      const cur = now.get(s);
      s._touch ??= new Map();
      for (const other of [...s._touch.keys()]) {
        if (!cur || !cur.has(other)) s._touch.delete(other);
      }
      if (cur) for (const other of cur) s._touch.set(other, (s._touch.get(other) || 0) + 1);
    }
  }

  // ---- render -----------------------------------------------------------

  function render() {
    CTX_.save();
    CTX_.translate(-camera.x, -camera.y);
    const ordered = ALL_.filter((s) => !s._dead).sort((a, b) => a.layer - b.layer);
    for (const s of ordered) {
      if (s.ani) s.ani._advance();
      s._draw();
    }
    CTX_.restore();
  }

  // text styling state (fill/textSize/textAlign) — q5.js-style globals that
  // real lesson code sets before every text() call (HUD scores, title
  // screens, game-over messages — 27 real script.js/solution.js files).
  let TEXT_COLOR = 'white', TEXT_SIZE = 14, TEXT_ALIGN = 'left';
  const CENTER = 'center', LEFT = 'left', RIGHT = 'right';
  function fill(c) { TEXT_COLOR = typeof c === 'number' ? `rgb(${c},${c},${c})` : c; }
  function textSize(px) { TEXT_SIZE = px; }
  function textAlign(mode) { TEXT_ALIGN = mode; }

  function text(str, x, y, size, color) {
    CTX_.save();
    CTX_.translate(-camera.x, -camera.y);
    CTX_.fillStyle = color || TEXT_COLOR;
    CTX_.font = (size || TEXT_SIZE) + 'px monospace';
    CTX_.textAlign = TEXT_ALIGN;
    CTX_.fillText(str, x, y);
    CTX_.restore();
  }

  // ---- q5.js drawing primitives (used by real lesson code) ---------------

  function square(x, y, s) {
    CTX_.save();
    CTX_.translate(-camera.x, -camera.y);
    CTX_.fillRect(x, y, s, s);
    CTX_.restore();
  }

  // ---- persistence ------------------------------------------------------

  function storeItem(name, val) { localStorage.setItem(name, JSON.stringify(val)); }
  function getItem(name) {
    const raw = localStorage.getItem(name);
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch (e) { return raw; }
  }
  function removeItem(name) { localStorage.removeItem(name); }

  // ---- main loop --------------------------------------------------------

  let _loopRunning = true;

  function noLoop() { _loopRunning = false; }

  function start() {
    const setupFn = window.setup || (() => {});
    const updateFn = window.update || (() => {});
    const drawFn = window.draw || (() => {});

    setupFn.call(global);
    if (!CANVAS_) throw new Error('new Canvas(w, h) must be called in setup()');

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!KEYS_DOWN[k]) KEYS_PRESSED[k] = true;
      KEYS_DOWN[k] = true;
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { KEYS_DOWN[e.key.toLowerCase()] = false; });
    CANVAS_.addEventListener('mousemove', (e) => {
      const r = CANVAS_.getBoundingClientRect();
      MOUSE.x = e.clientX - r.left + camera.x;
      MOUSE.y = e.clientY - r.top + camera.y;
    });
    CANVAS_.addEventListener('mousedown', () => { MOUSE._pressed = true; MOUSE._down = true; });
    window.addEventListener('mouseup', () => { MOUSE._down = false; MOUSE._released = true; });

    let last = performance.now();
    function loop(now) {
      if (!_loopRunning) return; // noLoop(): fully stop, don't idle-spin rAF
      const dt = (now - last) / 1000;
      last = now;
      const step = Math.min(dt, 0.05);

      FRAME_++;

      updateFn(step);
      stepPhysics();
      _updateContacts();
      drawFn();
      render();

      // Edge-trigger flags reset AFTER this frame's update/draw ran, not
      // before — keydown/mousedown fire asynchronously between rAF calls, so
      // resetting at the top of the frame wiped a press before user code
      // (kb.presses()/mouse.presses()) ever got to read it. Pre-existing bug,
      // caught while smoke-testing mouse.presses(); fix is this reorder only.
      for (const k in KEYS_PRESSED) KEYS_PRESSED[k] = false;
      MOUSE._pressed = false;
      MOUSE._released = false;

      for (let i = ALL_.length - 1; i >= 0; i--) {
        if (ALL_[i]._dead) ALL_.splice(i, 1);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // expose
  global.Canvas = Canvas;
  global.Sprite = Sprite;
  global.Group = Group;
  global.HingeJoint = HingeJoint;
  global.DistanceJoint = DistanceJoint;
  global.SliderJoint = SliderJoint;
  global.WheelJoint = WheelJoint;
  global.GrabberJoint = GrabberJoint;
  global.GlueJoint = GlueJoint;
  global.Ani = Ani;
  global.Anis = Anis;
  global.world = world;
  global.camera = camera;
  global.kb = kb;
  global.mouse = mouse;
  global.allSprites = allSprites;
  Object.defineProperty(global, 'frameCount', { get: () => FRAME_ });
  Object.defineProperty(global, 'width', { get: () => W_ });
  Object.defineProperty(global, 'height', { get: () => H_ });
  Object.defineProperty(global, 'mouseX', { get: () => MOUSE.x });
  Object.defineProperty(global, 'mouseY', { get: () => MOUSE.y });
  global.cos = Math.cos;
  global.sin = Math.sin;
  global.background = background;
  global.text = text;
  global.fill = fill;
  global.textSize = textSize;
  global.textAlign = textAlign;
  global.square = square;
  global.CENTER = CENTER;
  global.LEFT = LEFT;
  global.RIGHT = RIGHT;
  global.storeItem = storeItem;
  global.getItem = getItem;
  global.removeItem = removeItem;
  global.noLoop = noLoop;
  global.start = start;

  // Auto-boot: if the student sketch defines window.setup (the real q5play
  // convention — sketches never call start() themselves), start the engine.
  // The deferred check (setTimeout 0) fires after all synchronous <script>
  // tags in the page have executed, which is when the student sketch has
  // defined window.setup. The immediate check handles the edge case where
  // the engine <script> tag appears after the student sketch.
  function _tryAutoBoot() {
    if (typeof global.setup === 'function' && !global._shplayStarted) {
      global._shplayStarted = true;
      start();
    }
  }
  _tryAutoBoot();
  setTimeout(_tryAutoBoot, 0);

  /* SCOPE — 2D only; 3D is out of scope by design.
   *   This engine is strictly 2D (Box2D is 2D-only; planck.js is a Box2D port).
   *   CSCI 4's Q2 game unit is a 2D course; 3D comes from JSCAD modeling (Q3–Q4),
   *   which uses its own geometry, not this engine.
   *   FUTURE EXTENSION (not today): if 3D is ever needed, build a separate
   *   sibling engine (Sprite3D, camera.eye) over a 3D physics backend rather
   *   than growing a z-axis into this 2D facade. Keep this file 2D-clean.
   */
})(window);
