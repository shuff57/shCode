// Behavioural checks for the surface build-out (_workspace/gauntlet/SPEC-surface.md).
//
// Written by the lead, in a separate file from the builder's work, and wired
// into the runner only after the build lands — so a builder never races the
// grader and never sees a red it did not cause.
//
// House rule, learned three times over in this session: a check that only
// asserts a member EXISTS is worthless. `typeof s.drag === 'number'` passes on
// a getter that returns a constant. Every check here drives the engine and
// measures a consequence. Where a value is chosen (a damping constant, a
// force), the check asserts the DIRECTION and rough magnitude of the effect,
// not an exact float, so it survives a legitimate reimplementation.

export const SURFACE_CHECKS = [
  // ---- physics ------------------------------------------------------------
  {
    name: 'drag and rotationDrag actually slow a sprite down',
    area: 'physics',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          free = new Sprite(50,100,20); free.vel.x = 5;
          damped = new Sprite(50,200,20); damped.vel.x = 5; damped.drag = 4;
          spinFree = new Sprite(50,300,20); spinFree.angularVelocity = 10;
          spinDamped = new Sprite(50,350,20); spinDamped.angularVelocity = 10; spinDamped.rotationDrag = 4;
          readBack = { drag: damped.drag, rotationDrag: spinDamped.rotationDrag };
        }
        function draw(){ if (frameCount === 30) {
          out = { free: free.vel.x, damped: damped.vel.x,
                  spinFree: spinFree.angularVelocity, spinDamped: spinDamped.angularVelocity };
        } }
      `, { frames: 34 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const { out, readBack } = r.box.sandbox;
      if (!out) return 'probe never ran';
      if (readBack.drag !== 4) return 'sprite.drag read back as ' + readBack.drag + ', expected 4';
      if (readBack.rotationDrag !== 4) return 'sprite.rotationDrag read back as ' + readBack.rotationDrag + ', expected 4';
      if (!(out.damped < out.free * 0.5))
        return 'drag=4 left vel.x at ' + out.damped.toFixed(3) + ' vs ' + out.free.toFixed(3) +
          ' undamped — damping is not reaching the body';
      if (!(Math.abs(out.spinDamped) < Math.abs(out.spinFree) * 0.5))
        return 'rotationDrag=4 left angularVelocity at ' + out.spinDamped.toFixed(3) +
          ' vs ' + out.spinFree.toFixed(3) + ' undamped';
      return true;
    },
  },
  {
    name: 'rotationLock freezes rotation without freezing movement',
    area: 'physics',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(50,100,20,20); s.rotationLock = true;
          s.angularVelocity = 20; s.vel.x = 3;
          readBack = s.rotationLock;
        }
        function draw(){ if (frameCount === 20) out = { rot: s.rotation, x: s.x }; }
      `, { frames: 24 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const { out, readBack } = r.box.sandbox;
      if (readBack !== true) return 'sprite.rotationLock read back as ' + readBack;
      if (Math.abs(out.rot) > 0.001) return 'rotation reached ' + out.rot + ' with rotationLock on';
      if (!(out.x > 55)) return 'rotationLock also stopped linear motion (x=' + out.x + '); it must only lock spin';
      return true;
    },
  },
  {
    name: 'rotationSpeed is a live alias of angularVelocity, same unit',
    area: 'physics',
    // Both names must read the SAME underlying value in deg/frame. An alias
    // that silently uses rad/s would still "work" in a demo, 60x too fast.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(200,200,20);
          s.angularVelocity = 6;  viaAV = s.rotationSpeed;
          s.rotationSpeed = -3;   viaRS = s.angularVelocity;
        }
        function draw(){ if (frameCount === 11) spunDeg = s.rotation; }
      `, { frames: 14 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (Math.abs(b.viaAV - 6) > 1e-6) return 'set angularVelocity=6, rotationSpeed read ' + b.viaAV;
      if (Math.abs(b.viaRS + 3) > 1e-6) return 'set rotationSpeed=-3, angularVelocity read ' + b.viaRS;
      // 10 frames at -3 deg/frame is about -30 degrees; generous window for
      // solver drift, tight enough to catch a 60x unit error.
      if (!(b.spunDeg < -15 && b.spunDeg > -45))
        return 'after ~10 frames at rotationSpeed=-3 the sprite turned ' + b.spunDeg.toFixed(1) +
          ' degrees; expected roughly -30. A 60x error here means rad/s crept in.';
      return true;
    },
  },
  {
    name: 'gravityScale scales gravity per sprite',
    area: 'physics',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 10;
          normal = new Sprite(100,50,20);
          floaty = new Sprite(200,50,20); floaty.gravityScale = 0;
          heavy  = new Sprite(300,50,20); heavy.gravityScale = 2;
          readBack = floaty.gravityScale;
        }
        function draw(){ if (frameCount === 25)
          out = { normal: normal.vel.y, floaty: floaty.vel.y, heavy: heavy.vel.y }; }
      `, { frames: 29 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const { out, readBack } = r.box.sandbox;
      if (readBack !== 0) return 'gravityScale read back as ' + readBack + ', expected 0';
      if (Math.abs(out.floaty) > 0.01) return 'gravityScale=0 still fell (vel.y=' + out.floaty + ')';
      if (!(out.normal > 0.1)) return 'the control sprite did not fall; the test is not measuring gravity';
      if (!(out.heavy > out.normal * 1.5))
        return 'gravityScale=2 fell at ' + out.heavy.toFixed(3) + ' vs normal ' + out.normal.toFixed(3);
      return true;
    },
  },
  {
    name: 'applyTorque spins, applyForceScaled is mass-independent',
    area: 'physics',
    // applyForce is raw newtons, so a heavier sprite accelerates less.
    // applyForceScaled multiplies by mass, so two sprites of different mass
    // get the SAME acceleration. That difference is the whole point of it.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          t = new Sprite(100,100,30,30);
          light = new Sprite(100,200,20,20);
          heavy = new Sprite(200,200,60,60);
          lightRaw = new Sprite(100,300,20,20);
          heavyRaw = new Sprite(200,300,60,60);
          masses = { light: light.mass, heavy: heavy.mass };
        }
        function draw(){
          if (frameCount < 12) {
            t.applyTorque(50);
            light.applyForceScaled(20, 0); heavy.applyForceScaled(20, 0);
            lightRaw.applyForce(20, 0);    heavyRaw.applyForce(20, 0);
          }
          if (frameCount === 14) out = { spin: t.angularVelocity,
            ls: light.vel.x, hs: heavy.vel.x, lr: lightRaw.vel.x, hr: heavyRaw.vel.x };
        }
      `, { frames: 18 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const { out, masses } = r.box.sandbox;
      if (!(masses.heavy > masses.light * 2))
        return 'the two test sprites have similar mass (' + JSON.stringify(masses) + '); the check cannot distinguish the two force modes';
      if (!(Math.abs(out.spin) > 0.01)) return 'applyTorque did not spin the sprite (angularVelocity ' + out.spin + ')';
      // scaled: same acceleration regardless of mass
      const ratioScaled = out.hs / out.ls;
      if (!(ratioScaled > 0.8 && ratioScaled < 1.25))
        return 'applyForceScaled gave light=' + out.ls.toFixed(3) + ' heavy=' + out.hs.toFixed(3) +
          ' (ratio ' + ratioScaled.toFixed(2) + '); it multiplies by mass, so both should reach the SAME speed';
      // raw: heavier moves less
      if (!(out.hr < out.lr * 0.6))
        return 'applyForce gave light=' + out.lr.toFixed(3) + ' heavy=' + out.hr.toFixed(3) +
          '; raw newtons must accelerate the heavier sprite less. If these match, applyForce got mass-scaled too.';
      return true;
    },
  },
  {
    name: 'sleeping / allowSleeping / isSuperFast round-trip and take effect',
    area: 'physics',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(100,100,20); s.vel.x = 4;
          noSleep = new Sprite(100,200,20); noSleep.allowSleeping = false;
          fast = new Sprite(100,300,20); fast.isSuperFast = true;
          flags = { allowSleeping: noSleep.allowSleeping, superFast: fast.isSuperFast,
                    awakeAtStart: s.sleeping };
          s.sleeping = true; putToSleep = s.sleeping;
        }
        function draw(){ if (frameCount === 12) frozen = { x: s.x, sleeping: s.sleeping }; }
      `, { frames: 16 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.flags.allowSleeping !== false) return 'allowSleeping read back as ' + b.flags.allowSleeping;
      if (b.flags.superFast !== true) return 'isSuperFast read back as ' + b.flags.superFast;
      if (b.flags.awakeAtStart !== false) return 'a moving sprite reported sleeping=' + b.flags.awakeAtStart + ' at creation';
      if (b.putToSleep !== true) return 'setting sleeping=true did not stick (read ' + b.putToSleep + ')';
      if (Math.abs(b.frozen.x - 100) > 0.5)
        return 'a sprite put to sleep still travelled to x=' + b.frozen.x.toFixed(2) + '; sleeping must halt simulation';
      return true;
    },
  },
  {
    name: 'centerOfMass is in pixels, physicsEnabled halts simulation',
    area: 'physics',
    // centerOfMass in metres instead of pixels is the classic PXM slip: it
    // would read ~6.7 instead of ~200 and look plausible in isolation.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(200,150,40,40);
          com = { x: s.centerOfMass.x, y: s.centerOfMass.y };
          off = new Sprite(100,100,20); off.vel.x = 5; off.physicsEnabled = false;
          readBack = off.physicsEnabled;
        }
        function draw(){ if (frameCount === 15) stoppedAt = off.x; }
      `, { frames: 19 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (Math.abs(b.com.x - 200) > 1 || Math.abs(b.com.y - 150) > 1)
        return 'centerOfMass read ' + JSON.stringify(b.com) + ' for a sprite at (200,150); expected pixels, ' +
          'not metres — a value near (6.7, 5) means the PXM conversion is missing';
      if (b.readBack !== false) return 'physicsEnabled read back as ' + b.readBack;
      if (Math.abs(b.stoppedAt - 100) > 0.5)
        return 'physicsEnabled=false still let the sprite move to x=' + b.stoppedAt.toFixed(2);
      return true;
    },
  },

  // ---- motion helpers -----------------------------------------------------
  {
    name: 'angleToFace / rotationToFace / setSpeedAndDirection / isMoving',
    area: 'sprite',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(200,200,20); s.rotation = 0; s.collider = 'none';
          toRight = s.rotationToFace(300,200);
          toDown  = s.rotationToFace(200,300);
          turnDown = s.angleToFace(200,300);
          s.rotation = 90;
          turnFromDown = s.angleToFace(200,300);
          still = new Sprite(50,50,20); still.collider = 'none';
          movingAtRest = still.isMoving;
          still.setSpeedAndDirection(4, 90);
          sd = { speed: Math.round(still.speed*100)/100, dir: Math.round(still.direction),
                 vx: Math.round(still.vel.x*100)/100, vy: Math.round(still.vel.y*100)/100 };
          movingNow = still.isMoving;
        }
        function draw(){}
      `, { frames: 3 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (Math.abs(b.toRight) > 1e-6) return 'rotationToFace a point to the right gave ' + b.toRight + ', expected 0';
      if (Math.abs(b.toDown - 90) > 1e-6) return 'rotationToFace a point below gave ' + b.toDown + ', expected 90';
      if (Math.abs(b.turnDown - 90) > 1e-6)
        return 'angleToFace from rotation 0 to a point below gave ' + b.turnDown + ', expected 90 (the TURN needed)';
      if (Math.abs(b.turnFromDown) > 1e-6)
        return 'angleToFace when already facing the target gave ' + b.turnFromDown + ', expected 0. ' +
          'angleToFace is the turn required; rotationToFace is the absolute angle. They must differ.';
      if (b.movingAtRest !== false) return 'isMoving was ' + b.movingAtRest + ' for a stationary sprite';
      if (b.sd.speed !== 4 || b.sd.dir !== 90)
        return 'setSpeedAndDirection(4, 90) gave ' + JSON.stringify(b.sd);
      if (b.sd.vy <= 0) return 'direction 90 should move +y (down); got vel ' + JSON.stringify(b.sd);
      if (b.movingNow !== true) return 'isMoving stayed false after setSpeedAndDirection';
      return true;
    },
  },
  {
    name: 'prevPos and prevRotation lag the current frame by exactly one',
    area: 'sprite',
    // The value must come from the END of the previous frame. A naive
    // implementation that snapshots at the wrong point in the loop reads
    // either the current position (lag 0) or two frames back.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(0,200,20); s.collider = 'none'; s.vel.x = 10;
          samples = [];
        }
        function draw(){
          if (frameCount > 3 && frameCount < 9)
            samples.push({ now: Math.round(s.x*100)/100, prev: Math.round(s.prevPos.x*100)/100 });
        }
      `, { frames: 12 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const s = r.box.sandbox.samples;
      if (!s || s.length < 3) return 'not enough samples (' + (s ? s.length : 0) + ')';
      for (let i = 1; i < s.length; i++) {
        if (Math.abs(s[i].prev - s[i - 1].now) > 0.01) {
          return 'prevPos.x on one frame (' + s[i].prev + ') does not equal x on the frame before (' +
            s[i - 1].now + '). Samples: ' + JSON.stringify(s) +
            ' — the snapshot is taken at the wrong point in the loop.';
        }
      }
      if (Math.abs(s[s.length - 1].prev - s[s.length - 1].now) < 0.01)
        return 'prevPos equals the current position; it is being snapshotted after the move, not before';
      return true;
    },
  },
  {
    name: 'sprite.canvasPos is screen space and follows the camera',
    area: 'sprite',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(250,180,20); s.collider = 'none';
        }
        function draw(){
          if (frameCount === 2) atOrigin = { x: s.canvasPos.x, y: s.canvasPos.y };
          if (frameCount === 3) { camera.x = 100; camera.y = 40; }
          if (frameCount === 5) scrolled = { x: s.canvasPos.x, y: s.canvasPos.y, world: s.x };
        }
      `, { frames: 8 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      // Positions round-trip through metres, so compare with a tolerance —
      // an exact === here failed on 250.00000000000003.
      const near = (a, want) => Math.abs(a - want) < 0.01;
      if (!near(b.atOrigin.x, 250) || !near(b.atOrigin.y, 180))
        return 'canvasPos with the camera at the origin was ' + JSON.stringify(b.atOrigin) + ', expected (250,180)';
      if (!near(b.scrolled.x, 150) || !near(b.scrolled.y, 140))
        return 'canvasPos after camera moved to (100,40) was ' + JSON.stringify(b.scrolled) + ', expected (150,140)';
      if (!near(b.scrolled.world, 250)) return 'the camera move changed sprite.x to ' + b.scrolled.world + '; it must not';
      return true;
    },
  },

  // ---- lifecycle ----------------------------------------------------------
  {
    name: 'life counts down and deletes the sprite at zero',
    area: 'sprite',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          doomed = new Sprite(100,100,20); doomed.collider = 'none'; doomed.life = 10;
          immortal = new Sprite(200,100,20); immortal.collider = 'none';
          log = [];
        }
        function draw(){
          log.push({ f: frameCount, life: doomed.life, removed: doomed.removed,
                     n: allSprites.length });
        }
      `, { frames: 20 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const log = r.box.sandbox.log;
      const first = log[0];
      if (typeof first.life !== 'number') return 'sprite.life read as ' + first.life + ' on frame 1';
      const later = log[log.length - 1];
      if (later.life >= first.life)
        return 'life did not count down (frame 1: ' + first.life + ', last frame: ' + later.life + ')';
      if (later.removed !== true)
        return 'after ' + log.length + ' frames with life=10 the sprite reports removed=' + later.removed;
      if (later.n !== 1)
        return 'allSprites still holds ' + later.n + ' sprite(s); the immortal one should be alone';
      const immortalGone = log.some((e) => e.n === 0);
      if (immortalGone) return 'the sprite with no life set was also deleted; life must be opt-in';
      return true;
    },
  },
  {
    name: 'colour / fill alias color, and groups / joints report membership',
    area: 'sprite',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(100,100,20); s.color = 'gold';
          readAlias = { colour: s.colour, fill: s.fill };
          s.colour = 'tomato'; viaColour = s.color;
          s.fill = 'teal';     viaFill = s.color;
          g1 = new Group(); g2 = new Group();
          m = new Sprite(200,200,20); g1.push(m); g2.push(m);
          groupCount = m.groups.length;
          inAll = m.groups.includes(g1) && m.groups.includes(g2);
          a = new Sprite(300,100,20); b2 = new Sprite(340,100,20);
          j = new GlueJoint(a, b2);
          jointCount = a.joints.length;
        }
        function draw(){}
      `, { frames: 3 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.readAlias.colour !== 'gold' || b.readAlias.fill !== 'gold')
        return 'colour/fill did not read color: ' + JSON.stringify(b.readAlias);
      if (b.viaColour !== 'tomato') return 'writing .colour did not reach .color (got ' + b.viaColour + ')';
      if (b.viaFill !== 'teal') return 'writing .fill did not reach .color (got ' + b.viaFill + ')';
      // groups includes allSprites, so >= 3 for a sprite in two custom groups
      if (!b.inAll) return 'sprite.groups is missing one of the groups it was pushed into';
      if (b.groupCount < 2) return 'sprite.groups reported ' + b.groupCount + ' group(s), expected at least 2';
      if (b.jointCount < 1) return 'sprite.joints reported ' + b.jointCount + ' after a GlueJoint was attached';
      return true;
    },
  },
  {
    name: 'per-sprite update/draw overrides run, and autoDraw/autoUpdate suppress',
    area: 'sprite',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          ticks = 0; paints = 0;
          a = new Sprite(100,100,20); a.collider = 'none';
          a.update = function(){ ticks++; };
          a.draw = function(){ paints++; };
          // autoUpdate gates the sprite's own update CALLBACK, not physics
          // (q5play.js:2382 - _update() calls _customUpdate only when set).
          // An earlier version of this check asserted the sprite stopped
          // moving, which q5play never promised.
          quietTicks = 0;
          quiet = new Sprite(200,100,20); quiet.collider = 'none';
          quiet.update = function(){ quietTicks++; };
          quiet.autoUpdate = false; quiet.vel.x = 8;
          flags = { autoDraw: quiet.autoDraw, autoUpdate: quiet.autoUpdate };
        }
        function draw(){ if (frameCount === 10) parked = quiet.x; }
      `, { frames: 14 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.flags.autoDraw !== false && b.flags.autoDraw !== true)
        return 'autoDraw read as ' + b.flags.autoDraw + '; it should be a boolean defaulting to true';
      if (b.flags.autoUpdate !== false) return 'autoUpdate did not stick as false';
      if (!(b.ticks > 3)) return 'a per-sprite update override ran ' + b.ticks + ' times in 14 frames';
      if (!(b.paints > 3)) return 'a per-sprite draw override ran ' + b.paints + ' times in 14 frames';
      if (b.quietTicks !== 0)
        return 'autoUpdate=false still ran the sprite\'s update callback ' + b.quietTicks + ' times';
      if (!(b.parked > 200))
        return 'autoUpdate=false stopped the sprite moving (x=' + b.parked.toFixed(2) + '). It gates the ' +
          'update CALLBACK only — physics must keep running. Use physicsEnabled to freeze a body.';
      return true;
    },
  },

  // ---- group --------------------------------------------------------------
  {
    name: 'group add / contains / deleteAll',
    area: 'group',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          g = new Group();
          a = new Sprite(50,50,10); b2 = new Sprite(80,50,10); loose = new Sprite(300,300,10);
          g.add(a); g.add(b2);
          n = g.length;
          has = { a: g.contains(a), loose: g.contains(loose) };
          g.add(a); afterDupe = g.length;
          worldBefore = allSprites.length;
          g.deleteAll();
          after = { len: g.length, world: allSprites.length, aRemoved: a.removed, looseRemoved: loose.removed };
        }
        function draw(){}
      `, { frames: 3 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.n !== 2) return 'group.add twice gave length ' + b.n + ', expected 2';
      if (b.has.a !== true) return 'contains() said false for a member';
      if (b.has.loose !== false) return 'contains() said true for a sprite never added';
      if (b.afterDupe !== 2) return 'adding the same sprite twice gave length ' + b.afterDupe + '; add must dedupe like push';
      if (b.after.len !== 0) return 'deleteAll left ' + b.after.len + ' member(s) in the group';
      if (b.after.aRemoved !== true) return 'deleteAll emptied the group but did not delete the sprites';
      if (b.after.looseRemoved === true) return 'deleteAll also deleted a sprite that was never in the group';
      if (b.after.world !== b.worldBefore - 2)
        return 'allSprites went from ' + b.worldBefore + ' to ' + b.after.world + '; expected exactly 2 fewer';
      return true;
    },
  },

  // ---- world --------------------------------------------------------------
  {
    name: 'world.getSpritesAt returns every sprite at a point, topmost first',
    area: 'world',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          low = new Sprite(200,200,60,60); low.collider='none'; low.layer = 1;
          high = new Sprite(200,200,40,40); high.collider='none'; high.layer = 5;
          away = new Sprite(50,50,20); away.collider='none';
          hits = world.getSpritesAt(200,200);
          names = hits.map(s => s.layer);
          empty = world.getSpritesAt(390,390).length;
          isArray = Array.isArray(hits);
        }
        function draw(){}
      `, { frames: 3 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (!b.isArray) return 'getSpritesAt did not return an array';
      if (b.names.length !== 2)
        return 'getSpritesAt found ' + b.names.length + ' sprite(s) at a point where 2 overlap: ' + JSON.stringify(b.names);
      if (b.names[0] !== 5)
        return 'getSpritesAt returned layer order ' + JSON.stringify(b.names) + '; topmost (layer 5) must come first';
      if (b.empty !== 0) return 'getSpritesAt found ' + b.empty + ' sprite(s) at an empty point';
      return true;
    },
  },
  {
    name: 'world.explodeAt: direction, radius cutoff, AND distance falloff',
    area: 'world',
    // The magnitude here is deliberately small. An earlier version used 40,
    // which drives every sprite in range past the solver's 60 px/frame
    // velocity ceiling — they all came out at an identical speed, so the
    // check passed direction and radius while being completely blind to
    // whether falloff existed at all. Same trap as testing rotateTowards at
    // 90 degrees: the test value sat where right and wrong look alike.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(600,400); world.gravity.y = 0;
          left  = new Sprite(150,200,20);
          near  = new Sprite(220,200,20);
          mid   = new Sprite(280,200,20);
          rim   = new Sprite(315,200,20);
          far   = new Sprite(580,380,20);
          world.explodeAt(200, 200, 120, 5);
        }
        function draw(){ if (frameCount === 3) out = {
          l: left.vel.x, near: near.vel.x, mid: mid.vel.x, rim: rim.vel.x,
          far: Math.hypot(far.vel.x, far.vel.y) }; }
      `, { frames: 7 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const out = r.box.sandbox.out;
      if (!out) return 'probe never ran';
      if (!(out.l < -0.001)) return 'the sprite left of the blast moved ' + out.l.toFixed(4) + '; it should be pushed -x';
      if (!(out.near > 0.001)) return 'the sprite right of the blast moved ' + out.near.toFixed(4) + '; it should be pushed +x';
      if (out.far > 0.001) return 'a sprite well outside the radius was moved (speed ' + out.far.toFixed(4) + ')';
      // strictly weaker with distance — this is what saturation hid
      if (!(out.near > out.mid && out.mid > out.rim)) {
        return 'blast strength did not fall off with distance: near=' + out.near.toFixed(4) +
          ' mid=' + out.mid.toFixed(4) + ' rim=' + out.rim.toFixed(4) +
          ' (all roughly equal means either no falloff, or a magnitude high enough to hit the velocity ceiling)';
      }
      return true;
    },
  },
  {
    name: 'the solver clamps velocity to 60 px/frame — measured, not assumed',
    area: 'world',
    informational: true,
    // Not a defect and not fixable without changing planck's maxTranslation,
    // but it IS silent: `sprite.vel.x = 1000` reads back as 1000 and is 60 one
    // step later. Anything tuned above this ceiling behaves identically to
    // anything else above it, which is how explodeAt's falloff hid. Recorded
    // as informational so the number is measured on every run rather than
    // remembered — if a planck upgrade moves it, this says so.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          s = new Sprite(200,200,20); s.vel.x = 1000; immediate = s.vel.x;
        }
        function draw(){ if (frameCount === 4) settled = Math.round(s.vel.x * 100) / 100; }
      `, { frames: 8 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.immediate === 1000 && b.settled === 60) {
        return 'ceiling confirmed at 60 px/frame (set 1000, read 1000, solver settled to 60)';
      }
      return 'velocity ceiling moved: set 1000, read back ' + b.immediate + ', settled at ' + b.settled +
        ' (was 60). If planck was upgraded, re-check anything tuned near the old ceiling.';
    },
  },
  {
    name: 'autoStep=false hands physics to the sketch via world.physicsUpdate',
    area: 'world',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          world.autoStep = false;
          s = new Sprite(50,200,20); s.collider='none'; s.vel.x = 10;
          readBack = world.autoStep;
        }
        function draw(){
          if (frameCount === 8) frozen = s.x;
          if (frameCount > 8 && frameCount < 14) world.physicsUpdate();
          if (frameCount === 15) resumed = s.x;
        }
      `, { frames: 18 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.readBack !== false) return 'world.autoStep did not stick as false';
      if (Math.abs(b.frozen - 50) > 0.5)
        return 'with autoStep=false the sprite still moved to x=' + b.frozen.toFixed(2) + ' on its own';
      if (!(b.resumed > 51))
        return 'manual world.physicsUpdate() calls did not advance the sprite (x=' + b.resumed.toFixed(2) + ')';
      return true;
    },
  },

  {
    name: 'camera.off() and sprite.screenSpace pin drawing to the screen',
    area: 'world',
    // Found by an integration run, not by parity: a HUD sprite scrolled off
    // with the level because shPlay renders sprites for you and nothing could
    // opt out of the camera. Asserted against the RECORDED canvas transforms,
    // because "the flag is set" says nothing about where the pixels land.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          hud = new Sprite(40,20,60,16); hud.screenSpace = true; hud.collider = 'none';
          world_ = new Sprite(40,20,60,16); world_.collider = 'none';
          camera.x = 300; camera.y = 100;
        }
        function draw(){
          if (frameCount === 2) {
            states = { onByDefault: camera.isActive };
            camera.off(); states.afterOff = camera.isActive;
            camera.on();  states.afterOn = camera.isActive;
          }
          if (frameCount === 3) {
            hudScreen = Math.round(hud.canvasPos.x);
            worldScreen = Math.round(world_.canvasPos.x);
            // the natural hit-test call must find BOTH kinds
            hudHit = world.getSpritesAt(hud.x + camera.x, hud.y + camera.y).includes(hud);
            worldHit = world.getSpritesAt(world_.x, world_.y).includes(world_);
          }
        }
      `, { frames: 6 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      if (b.states.onByDefault !== true) return 'camera.isActive should start true, was ' + b.states.onByDefault;
      if (b.states.afterOff !== false) return 'camera.off() left isActive ' + b.states.afterOff;
      if (b.states.afterOn !== true) return 'camera.on() left isActive ' + b.states.afterOn;

      // The real assertion: with the camera at x=300, world sprites get a
      // -300 translate and screen-space sprites get none.
      const translates = r.box.ops.filter((o) => o.op === 'translate' && o.args[0] === -300);
      if (!translates.length)
        return 'no camera translate of -300 was recorded; world sprites are not being offset by the camera at all';
      const passes = r.box.ops.filter((o) => o.op === 'save').length;
      if (passes < 2)
        return 'render() emitted ' + passes + ' save() call(s); a screen-space sprite needs its own pass ' +
          'outside the camera transform';
      // canvasPos means "where is this on screen". A screen-space sprite is
      // drawn without the camera, so its screen pixel IS its x — identity.
      // An earlier version of this check asserted the opposite (that both
      // sprites read the same) and encoded the wrong model: it would have
      // locked in a HUD reporting itself at x=-440 while visibly at x=60.
      if (b.hudScreen !== 40)
        return 'a screenSpace sprite at x=40 reported canvasPos.x ' + b.hudScreen +
          '; it is drawn without the camera, so its screen position is its own x';
      if (b.worldScreen !== 40 - 300)
        return 'a world sprite at x=40 with camera.x=300 reported canvasPos.x ' + b.worldScreen + ', expected -260';
      // and the consequence that actually matters: can you click the button?
      if (!b.hudHit)
        return 'world.getSpritesAt() could not find a screenSpace sprite under the cursor — ' +
          'a HUD button is unclickable as soon as the camera moves';
      if (!b.worldHit) return 'world.getSpritesAt() stopped finding ordinary world sprites';
      return true;
    },
  },

  {
    name: "collider 'none' ignores gravity but still moves under vel",
    area: 'physics',
    // A 'none' sprite is what the course calls a trigger zone or a pickup. It
    // kept a dynamic body, so in a gravity world it silently fell out of the
    // level: lessons/6-4-18-a15-1-platformer's goal sprite went from y=230 to
    // y=1588 by frame 180 on a 400px canvas, and the corpus never noticed
    // because nothing throws when a sprite leaves the screen.
    //
    // The body stays dynamic on purpose — moving pickups and sensor-bullets
    // set .vel — so this asserts BOTH halves: no gravity, but vel still works.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,300); world.gravity.y = 10;
          zone   = new Sprite(100,100,20); zone.collider = 'none';
          mover  = new Sprite(200,100,20); mover.collider = 'none'; mover.vel.x = 3;
          faller = new Sprite(300,100,20);
          // switching back must restore gravity, not strand the sprite
          flip = new Sprite(350,100,20); flip.collider = 'none'; flip.collider = 'dynamic';
          // an explicit gravityScale must survive the sensor switch
          heavy = new Sprite(50,100,20); heavy.gravityScale = 2; heavy.collider = 'none';
        }
        function draw(){ if (frameCount === 50) out = {
          zone: Math.round(zone.y), moverX: Math.round(mover.x), moverY: Math.round(mover.y),
          faller: Math.round(faller.y), flip: Math.round(flip.y), heavy: Math.round(heavy.y),
          gScale: zone.gravityScale }; }
      `, { frames: 54 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const o = r.box.sandbox.out;
      if (!o) return 'probe never ran';
      if (o.faller <= 105)
        return 'the control sprite did not fall (y=' + o.faller + '); gravity is not on and the check proves nothing';
      if (o.zone !== 100)
        return "a collider 'none' sprite fell to y=" + o.zone + '. Trigger zones and pickups must stay put.';
      if (o.moverY !== 100)
        return "a moving 'none' sprite fell to y=" + o.moverY;
      if (!(o.moverX > 200))
        return "a 'none' sprite stopped responding to vel (x=" + o.moverX + '); only gravity should be switched off, ' +
          'not the whole body';
      if (o.flip <= 105)
        return "switching collider back to 'dynamic' left the sprite weightless (y=" + o.flip + ')';
      if (o.heavy !== 100)
        return "gravityScale=2 then collider='none' still fell to y=" + o.heavy;
      if (o.gScale !== 0) return "a 'none' sprite reports gravityScale " + o.gScale + ', expected 0';
      return true;
    },
  },

  {
    name: 'joints hold under load, and tear down cleanly',
    area: 'joints',
    // Six joint types shipped with no integration coverage at all. This
    // assembles the three structures a physics puzzle is actually made of —
    // a sagging rope, a swinging pendulum, a cart on a rail — and asserts the
    // CONSTRAINT each one is supposed to enforce, not merely that it built.
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(600,400); world.gravity.y = 10;
          rope = new Group(); rope.diameter = 10;
          anchorL = new Sprite(150,150,10); anchorL.collider='static';
          anchorR = new Sprite(330,150,10); anchorR.collider='static';
          prev = anchorL;
          for (let i = 0; i < 5; i++) { const l = new rope.Sprite(170+i*30,150); new DistanceJoint(prev,l); prev = l; }
          new DistanceJoint(rope[rope.length-1], anchorR);

          pivot = new Sprite(450,120,8); pivot.collider='static';
          bob = new Sprite(510,120,20);
          swing = new HingeJoint(pivot, bob, { anchor: { x:450, y:120 } });

          rail = new Sprite(100,300,10,10); rail.collider='static';
          cart = new Sprite(140,300,30,16);
          new SliderJoint(rail, cart, { axis: { x:1, y:0 } });

          gA = new Sprite(300,200,20,20); gB = new Sprite(322,200,20,20);
          new GlueJoint(gA, gB);

          start = { ropeY: Math.round(rope[2].y), bobY: Math.round(bob.y),
                    cartX: Math.round(cart.x), cartY: Math.round(cart.y),
                    gap: Math.round(gB.x - gA.x), bobJoints: bob.joints.length };
        }
        function draw(){
          if (frameCount === 40) cart.applyForce(60, 0);
          if (frameCount === 100) {
            mid = { ropeY: Math.round(rope[2].y), ropeX0: Math.round(rope[0].x),
                    bobY: Math.round(bob.y),
                    bobRadius: Math.round(Math.hypot(bob.x - pivot.x, bob.y - pivot.y)),
                    cartX: Math.round(cart.x), cartY: Math.round(cart.y),
                    gap: Math.round(gB.x - gA.x) };
            swing.delete();
            afterCut = bob.joints.length;
          }
          if (frameCount === 150) cutFall = Math.round(bob.y);
        }
      `, { frames: 155 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const { start, mid, afterCut, cutFall } = r.box.sandbox;
      if (start.bobJoints !== 1) return 'sprite.joints reported ' + start.bobJoints + ' after one HingeJoint';
      if (!(mid.ropeY > start.ropeY)) return 'a rope of DistanceJoints did not sag under gravity (y ' + start.ropeY + ' -> ' + mid.ropeY + ')';
      if (Math.abs(mid.ropeX0 - 170) > 60) return 'the rope tore away from its anchor (first link x=' + mid.ropeX0 + ')';
      if (!(mid.bobY > start.bobY)) return 'the pendulum never swung (y ' + start.bobY + ' -> ' + mid.bobY + ')';
      // the hinge's whole job: distance to the pivot is fixed
      if (Math.abs(mid.bobRadius - 60) > 2)
        return 'HingeJoint let the bob drift to radius ' + mid.bobRadius + ' from the pivot, expected 60';
      if (!(mid.cartX > start.cartX + 10)) return 'the cart did not slide along its rail (x ' + start.cartX + ' -> ' + mid.cartX + ')';
      if (mid.cartY !== start.cartY)
        return 'SliderJoint let the cart leave its axis (y ' + start.cartY + ' -> ' + mid.cartY + ')';
      if (Math.abs(mid.gap - start.gap) > 1)
        return 'GlueJoint let its two sprites drift apart (' + start.gap + ' -> ' + mid.gap + ')';
      // teardown
      if (afterCut !== 0) return 'joint.delete() left ' + afterCut + ' entr(ies) in sprite.joints';
      if (!(cutFall > mid.bobY + 20))
        return 'after joint.delete() the bob did not fall free (y ' + mid.bobY + ' -> ' + cutFall + ')';
      return true;
    },
  },
  {
    name: 'sprite text paints with its own fill, outline and layer order',
    area: 'sprite',
    // Asserted against RECORDED canvas ops. sprite.text was already once a
    // silent no-op in six lessons' starters AND their reference solutions,
    // which is exactly the failure a property read-back cannot see.
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        function setup(){ new Canvas(300,200); world.gravity.y = 0;
          slot = new Sprite(80,100,70,50); slot.collider='none';
          slot.text = 'slot'; slot.textFill = 'white'; slot.layer = 1;
          label = new Sprite(150,100,80,30); label.collider='none'; label.color='#111';
          label.text = 'HI'; label.textFill = 'cyan';
          label.textStroke = 'crimson'; label.textStrokeWeight = 4;
          label.layer = 5;
        }
        function draw(){}
      `);
      box.pump(3);
      const stroke = box.ops.filter((o) => o.op === 'strokeText');
      const fill = box.ops.filter((o) => o.op === 'fillText');
      if (!fill.length) return 'no fillText was recorded — sprite.text is not painting at all';
      if (!stroke.length) return 'textStroke was set but no strokeText was recorded';
      if (stroke[0].stroke !== 'crimson')
        return 'text outline drew with strokeStyle ' + stroke[0].stroke + ', expected crimson';
      const hi = fill.find((o) => o.args[0] === 'HI');
      if (!hi) return 'the label text never reached fillText';
      if (hi.fill !== 'cyan') return 'text drew with fillStyle ' + hi.fill + ', expected the sprite\'s textFill (cyan)';
      const lw = box.ops.filter((o) => o.op === 'set:lineWidth').map((o) => o.args[0]);
      if (!lw.includes(4)) return 'textStrokeWeight 4 never reached lineWidth (saw ' + JSON.stringify([...new Set(lw)]) + ')';
      // outline must go down BEFORE the fill or it paints over the letters
      const firstStroke = box.ops.indexOf(stroke[0]);
      if (firstStroke > box.ops.indexOf(hi))
        return 'strokeText ran after fillText; the outline would cover the letters';
      return true;
    },
  },

  {
    name: 'animations advance, switch, and slice a real source rect',
    area: 'sprite',
    // The source-rect half is the point. `fw = naturalWidth / frameCount` was
    // NaN for the whole life of the harness, because the fake Image defined
    // width/height and the engine reads naturalWidth/naturalHeight. Every
    // animated sprite drew nothing, headlessly, in silence. Asserting the
    // frame COUNTER alone would still have passed.
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        function setup(){ new Canvas(400,200); world.gravity.y = 0;
          s = new Sprite(100,100,32,32);
          s.addAni('long', 'long.png', 4);
          s.addAni('short', 'short.png', 2);
          autoActive = s.ani.name;          // first addAni activates
          imgCleared = s.image;             // ani and a still image are exclusive
          s.changeAni('short'); switched = s.ani.name;
          s.changeAni('nope');  bogus = s.ani.name;
          s.changeAni('long');
          seen = [];
        }
        function draw(){
          seen.push(s.ani.frame);
          if (frameCount === 30) { atSwitch = s.ani.frame; s.changeAni('short'); afterSwitch = s.ani.frame; }
        }
      `);
      box.pump(34);
      const b = box.sandbox;
      if (b.autoActive !== 'long') return 'the first addAni did not auto-activate (active: ' + b.autoActive + ')';
      if (b.imgCleared !== null) return 'adding an ani left sprite.image as ' + b.imgCleared + '; they are exclusive';
      if (b.switched !== 'short') return "changeAni('short') left " + b.switched + ' active';
      if (b.bogus !== 'short') return 'changeAni with an unknown name changed the active ani to ' + b.bogus;

      // frameDelay 4 over 4 frames: each index must be held, and all 4 seen
      const first16 = b.seen.slice(0, 16);
      if (new Set(first16).size !== 4)
        return 'over 16 frames a 4-frame ani showed ' + new Set(first16).size + ' distinct frames: ' + JSON.stringify(first16);
      if (first16[0] !== first16[3] || first16[0] === first16[4])
        return 'frameDelay is not being honoured; frames went ' + JSON.stringify(first16.slice(0, 6));

      // switching to a SHORTER ani must not carry an out-of-range index over
      if (b.atSwitch < 2) return 'the test never reached a frame index beyond the short ani; it proves nothing';
      if (b.afterSwitch >= 2)
        return 'switching from frame ' + b.atSwitch + ' to a 2-frame ani left frame ' + b.afterSwitch +
          ' — that would slice past the end of the sheet';

      // the actual pixels: a real, in-bounds source rectangle
      const draws = box.ops.filter((o) => o.op === 'drawImage' && o.args.length === 9);
      if (!draws.length) return 'no 9-argument drawImage was recorded — sprite sheets are not being sliced at all';
      for (const d of draws) {
        const [, sx, sy, sw, sh] = d.args;
        if ([sx, sy, sw, sh].some((n) => typeof n !== 'number' || !Number.isFinite(n)))
          return 'a sprite-sheet source rect was non-finite: ' + JSON.stringify(d.args.slice(1, 5));
        if (sw <= 0 || sh <= 0) return 'a source rect had zero or negative size: ' + JSON.stringify(d.args.slice(1, 5));
      }
      // frame 1 of a 4-frame, 256px-wide sheet starts at x=64
      if (!draws.some((d) => d.args[1] === 64 && d.args[3] === 64))
        return 'no frame sliced at the expected offset; source x values seen: ' +
          JSON.stringify([...new Set(draws.map((d) => d.args[1]))]);
      return true;
    },
  },

  // ---- sound ----------------------------------------------------------------
  {
    name: 'sound: web-audio graph, overlapping shots, clips, pan and fade',
    area: 'sound',
    // The backend moved from HTMLAudioElement to Web Audio, so this asserts
    // against the recorded NODE GRAPH rather than element method calls. The
    // behavioural claims are unchanged: overlapping one-shots, an idempotent
    // loop, master volume that scales without overwriting.
    //
    // Two of these caught real bugs in the rewrite:
    //   - `music.loop()` in setup() ALWAYS runs before fetch+decode finishes,
    //     so the naive version left the music silent for the whole session.
    //   - a mistyped clip name fell through to playing the WHOLE sprite
    //     sheet, i.e. every sound at once.
    run: async ({ createSandbox }) => {
      const box = createSandbox();
      box.run(`
        function setup(){ new Canvas(400,200); world.gravity.y = 0;
          coin  = loadSound('coin.mp3');
          music = loadSound('music.mp3');
          sfx   = loadSound('sfx.mp3', { clips: { jump: [0, 0.25], hit: [0.5, 0.9] } });
          // the killer case: loop() before anything is decoded
          music.volume = 0.4;
          music.loop(); music.loop(); music.loop();
        }
        function draw(){
          if (frameCount === 5) { coin.play(); coin.play(); coin.play(); }
          if (frameCount === 6) { coin.pan = -1; coin.rate = 1.5; coin.play(); }
          if (frameCount === 7) sfx.play('jump');
          if (frameCount === 8) sfx.play('hit');
          if (frameCount === 9) sfx.play('typo');     // must play NOTHING
          if (frameCount === 10) { masterVolume(0.5); music.fade(0.1, 2); }
          if (frameCount === 12) state = { music: music.playing, coin: coin.playing, own: music.volume };
          if (frameCount === 13) { music.stop(); stopped = music.playing; }
        }
      `);
      box.pump(4);
      // Let the fetch/decode promises settle, as real frames separated by
      // real time would.
      await new Promise((r) => setImmediate(r));
      box.pump(12);

      const b = box.sandbox;
      const L = box.audioLog;
      const starts = L.filter((e) => e.op === 'start');

      if (L.filter((e) => e.op === 'context').length !== 1)
        return 'expected exactly one AudioContext, saw ' + L.filter((e) => e.op === 'context').length;
      if (!L.some((e) => e.op === 'resume'))
        return 'the AudioContext was never resumed — it starts suspended, so nothing would ever be audible';
      if (L.filter((e) => e.op === 'decode').length !== 3)
        return 'expected 3 decodes for 3 sounds, saw ' + L.filter((e) => e.op === 'decode').length;

      const looped = starts.filter((s) => s.loop);
      if (looped.length !== 1)
        return 'expected exactly 1 looping start, saw ' + looped.length +
          '. 0 means loop() before decode was dropped and the music is silent forever; ' +
          '>1 means loop() is not idempotent and stacks a copy per call.';

      const oneShots = starts.filter((s) => !s.loop);
      // 3 rapid + 1 at a new rate + 2 clips = 6. The mistyped clip adds none.
      if (oneShots.length !== 6)
        return 'expected 6 one-shot starts, saw ' + oneShots.length +
          ' — a mistyped clip name must play nothing rather than the whole sprite sheet';
      if (!oneShots.some((s) => s.rate === 1.5)) return 'sound.rate never reached a voice';

      const jump = oneShots.find((s) => s.duration === 0.25);
      const hit = oneShots.find((s) => Math.abs((s.offset ?? 0) - 0.5) < 1e-9);
      if (!jump) return 'the "jump" clip did not start with its own duration; audio sprites are not slicing';
      if (!hit || Math.abs(hit.duration - 0.4) > 1e-9)
        return 'the "hit" clip should start at 0.5 for 0.4s, got ' + JSON.stringify(hit);

      if (!L.some((e) => e.op === 'create' && e.node === 'panner'))
        return 'no panner node was ever created, so sound.pan cannot do anything';
      const ramp = L.find((e) => e.op === 'ramp');
      if (!ramp) return 'fade() scheduled no ramp on any gain';
      if (Math.abs(ramp.to - 0.1) > 1e-9) return 'fade(0.1, 2) ramped to ' + ramp.to;
      if (!L.some((e) => e.op === 'cancel'))
        return 'fade() did not cancel scheduled values first; a second fade would jump instead of continuing';

      if (b.state.music !== true) return 'music.playing was false while it should be looping';
      if (b.state.own !== 0.1) return "after fade(0.1) the sound's own volume reads " + b.state.own;
      if (b.stopped !== false) return 'music.playing stayed true after stop()';
      return true;
    },
  },
  {
    name: 'sound: the OLD element-based expectations are gone',
    area: 'sound',
    informational: true,
    // Marker, not a gate. The first sound implementation used
    // HTMLAudioElement and cloned a DOM node per voice; this records that the
    // backend changed so anyone reading an old DECISIONS entry (D30) knows it
    // was superseded by D31 rather than wondering why the log looks different.
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        function setup(){ new Canvas(200,200); s = loadSound('x.mp3'); s.play(); }
        function draw(){}
      `);
      box.pump(3);
      const elementOps = box.audioLog.filter((e) => e.op === 'new' || e.op === 'play' || e.op === 'pause');
      if (elementOps.length === 0) {
        return 'backend is Web Audio (no HTMLAudioElement ops recorded) — D30 superseded by D31';
      }
      return 'HTMLAudioElement ops are still being recorded: ' + JSON.stringify(elementOps.slice(0, 3));
    },
  },

  // ---- input and globals --------------------------------------------------
  {
    name: 'kb.releases and mouse.releases fire on exactly one frame',
    area: 'input',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        kCount = 0; mCount = 0; kWhileHeld = 0;
        function setup(){ new Canvas(200,200); }
        function draw(){
          if (kb.releases('a')) kCount++;
          if (mouse.releases()) mCount++;
          if (kb.pressing('a')) kWhileHeld++;
        }
      `);
      box.pump(1);
      box.input.keyDown('a'); box.input.mouseDown();
      box.pump(4);
      box.input.keyUp('a'); box.input.mouseUp();
      box.pump(5);
      const b = box.sandbox;
      if (b.kWhileHeld < 3) return 'the key was not held long enough for the test (pressing seen ' + b.kWhileHeld + ' frames)';
      if (b.kCount !== 1) return "kb.releases('a') fired " + b.kCount + ' times across one press+release, expected exactly 1';
      if (b.mCount !== 1) return 'mouse.releases() fired ' + b.mCount + ' times, expected exactly 1';
      return true;
    },
  },
  {
    name: 'mouse.isOnCanvas and mouse.scrollDelta track and reset',
    area: 'input',
    run({ createSandbox }) {
      const box = createSandbox();
      box.run(`
        log = [];
        function setup(){ new Canvas(200,200); }
        function draw(){ log.push({ on: mouse.isOnCanvas,
          sx: mouse.scrollDelta.x, sy: mouse.scrollDelta.y }); }
      `);
      box.pump(2);
      box.input.mouseMove(50, 50);
      box.pump(2);
      const log = box.sandbox.log;
      if (log[log.length - 1].on !== true)
        return 'mouse.isOnCanvas was ' + log[log.length - 1].on + ' after the cursor moved onto the canvas';
      // scrollDelta is a VECTOR in q5play (its sweep zeroes .x and .y
      // separately) — a wheel scrolls in two axes. An earlier version of this
      // check expected a scalar; that was the check being wrong, not the engine.
      if (typeof log[0].sx !== 'number' || typeof log[0].sy !== 'number')
        return 'mouse.scrollDelta.x/.y read as ' + log[0].sx + '/' + log[0].sy + '; expected numbers';
      if (log.some((e) => e.sx !== 0 || e.sy !== 0))
        return 'scrollDelta was non-zero without any wheel event: ' +
          JSON.stringify(log.map((e) => [e.sx, e.sy]));
      return true;
    },
  },
  {
    name: 'collider-type globals exist and match the string form',
    area: 'globals',
    run({ runSketch }) {
      const r = runSketch(`
        function setup(){ new Canvas(400,400); world.gravity.y = 0;
          consts = { STATIC, DYNAMIC, KINEMATIC, STA, DYN, KIN };
          s = new Sprite(100,100,20);
          s.collider = STATIC;   viaConst = s.collider;
          s.collider = 'dynamic'; viaString = s.collider;
          s.physicsType = STATIC; viaPhysicsType = s.collider;
        }
        function draw(){}
      `, { frames: 3 });
      if (!r.ok) return 'sketch threw: ' + r.error?.message;
      const b = r.box.sandbox;
      for (const [k, v] of Object.entries(b.consts))
        if (typeof v !== 'string') return 'global ' + k + ' is ' + v + '; expected a collider-type string';
      if (b.consts.STATIC !== 'static' || b.consts.STA !== 'static')
        return 'STATIC/STA are ' + b.consts.STATIC + '/' + b.consts.STA + ', expected "static"';
      if (b.viaConst !== 'static') return 'setting collider = STATIC gave ' + b.viaConst;
      if (b.viaString !== 'dynamic') return 'the plain string form regressed (got ' + b.viaString + ')';
      if (b.viaPhysicsType !== 'static') return 'physicsType did not alias collider (got ' + b.viaPhysicsType + ')';
      return true;
    },
  },
];
