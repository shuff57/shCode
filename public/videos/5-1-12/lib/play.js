// play.js — the character is playable. ADDED for shCode's moSHion explainers (5.1.2 / 5.1.12).
//
// director.js owns the drawing and exposes the hooks this file uses: CHAR.play (a drag, a hold, an fx, a spoken
// word), CHAR.now (wall time), CHAR.bounds/clamp (the 1600x900 stage, sprite top-left), CHAR.hit/at (the body box),
// and MV.teleport. Everything here runs on the wall clock, never the teaching clock, so seeking a beat cannot
// replay a poke. The video's own controls win: clicks on the character never toggle playback.
//
// Feel (motion skill): respond on pointer-down, respect the grab offset, require ~7 px before committing to a drag,
// track 1:1, hard-clamp at the stage edge (he may never leave the picture), and ease him home after the hold. The
// power-ups answer an approach with hysteresis (fire once, re-arm only after the pointer leaves a wider ring).
(function () {
  'use strict';
  const frame = document.getElementById('frame');
  const stage = document.getElementById('stage');
  const CH = window.CHAR;
  if (!frame || !stage || !CH) return;
  const cover = document.getElementById('cover');

  const on = () => CH.on !== false;
  const now = () => CH.now();

  // stage px from a pointer event: #frame is CSS-scaled, #stage is its 1600x900 picture.
  function at(e) {
    const r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) * 1600 / (r.width || 1), y: (e.clientY - r.top) * 900 / (r.height || 1) };
  }
  const inside = p => p.x >= 0 && p.x <= 1600 && p.y >= 0 && p.y <= 900;

  let grab = null;                  // { id, x0, y0, offX, offY, started }
  let pointer = null;               // last stage point, for the hover cursor
  let armed = true;                 // a power-up may fire
  let lastFx = -1e9, lastCry = -1e9, next = 0;
  let suppress = false;             // the click that belongs to this gesture
  const KIND = ['rasengan', 'powerup', 'teleport'];
  const CRY = ['Whoa!', 'Woo!', 'Wow!', 'Hey!', 'Aaah!'];
  const NEAR = 165, FAR = 300, COOL = 3.6;      // seconds: CHAR.now() is the engine's wall clock

  const speak = text => { CH.play.say = { text, t0: now(), dur: 1.15 }; };
  const sayOuch = () => { speak(Math.random() < .5 ? 'Woo!' : 'Wow!'); lastCry = now(); };
  const cry = () => { speak(CRY[Math.floor(Math.random() * CRY.length)]); lastCry = now(); };
  const suppressClick = () => { suppress = true; setTimeout(() => { suppress = false; }, 500); };

  // ---- drag -----------------------------------------------------------------------------------------------
  function begin(p, e) {
    const b = CH.box;
    grab = { id: e.pointerId, x0: p.x, y0: p.y, offX: p.x - b[0], offY: p.y - b[1], started: false,
      lx: p.x, ly: p.y, lt: now() };
    try { frame.setPointerCapture(e.pointerId); } catch {}
    stage.style.cursor = 'grabbing';
  }

  function moved(p) {
    const t = now();
    if (!grab.started) {
      if (Math.hypot(p.x - grab.x0, p.y - grab.y0) < 7) return false;
      grab.started = true;
      CH.play.hold = null;
      CH.play.fx = null;             // the student's hand beats whatever he was doing
      grab.lx = p.x; grab.ly = p.y; grab.lt = t;
      cry();                         // grabbed: he has something to say about it
    }
    // Velocity is what makes him ragdoll: director.js turns it into a swing and a head tilt.
    const dt = Math.max(1 / 240, t - grab.lt);
    const vx = (p.x - grab.lx) / dt, vy = (p.y - grab.ly) / dt;
    grab.lx = p.x; grab.ly = p.y; grab.lt = t;
    const c = CH.clamp(p.x - grab.offX, p.y - grab.offY, 62);   // 62 px keeps the tipped body inside the stage
    CH.play.drag = { x: c.x, y: c.y, vx, vy, t };
    if (Math.hypot(vx, vy) > 90 && t - lastCry > .8) cry();   // ragged along: a fresh exclamation while it happens
    return true;
  }

  function end() {
    if (!grab) return;
    const g = grab;
    grab = null;
    try { frame.releasePointerCapture(g.id); } catch {}
    if (g.started) {
      const d = CH.play.drag;
      const b = CH.box || [0, 0, 0, 0];
      const x = d ? d.x : b[0], y = d ? d.y : b[1];
      CH.play.drag = null;
      CH.play.hold = { x, y, mode: 'hold', until: now() + 2.1, start: 0,
        vx: d ? d.vx : 0, vy: d ? d.vy : 0, t0rel: now() };   // the tip settles after release
      lastFx = now();
      sayOuch();
      suppressClick();
    } else {
      sayOuch();                     // a poke, not a drag (begin() only starts on his body)
      suppressClick();
    }
    stage.style.cursor = pointer && on() && CH.hit(pointer.x, pointer.y) ? 'grab' : '';
  }

  // ---- power-ups -------------------------------------------------------------------------------------------
  function trigger(kind, p) {
    const t = now();
    if (kind === 'rasengan') {
      CH.play.fx = { kind, t0: t, dur: 1.75, tgt: [p.x, p.y],
        tokens: [['woo', p.x + 60, p.y + 16], ['wow', p.x - 52, p.y - 10], ['!', p.x + 8, p.y - 56]] };
    } else if (kind === 'powerup') {
      CH.play.fx = { kind, t0: t, dur: 3.2, size: 1.05 };
    } else {
      const c = CH.at(), b = CH.bounds(), box = CH.box || [c[0] - b.w / 2, c[1] - b.h / 2];
      let dx = c[0] - p.x, dy = c[1] - p.y, d = Math.hypot(dx, dy);
      if (d < 24) { dx = 1; dy = -.4; d = Math.hypot(dx, dy); }
      const to = CH.clamp(c[0] + dx / d * 300 - b.w / 2, c[1] + dy / d * 220 - b.h / 2);
      CH.play.hold = { x: to.x, y: to.y, mode: 'hold', until: t + 1.5, start: t + .11 };
      CH.play.fx = { kind, t0: t, dur: 1.25,
        from: [box[0] + b.w / 2, box[1] + b.h / 2], to: [to.x + b.w / 2, to.y + b.h / 2] };
    }
  }

  function approach(p) {
    if (!on() || (cover && !cover.hidden) || CH.play.fx || CH.play.say) return;   // the cover owns the pointer until Play
    const c = CH.at();
    const d = Math.hypot(p.x - c[0], p.y - c[1]);
    if (d > FAR) { armed = true; return; }
    if (!armed || d > NEAR) return;
    const t = now();
    if (t - lastFx < COOL) return;
    trigger(KIND[next++ % KIND.length], p);
    armed = false; lastFx = t;
  }

  // ---- pointer wiring --------------------------------------------------------------------------------------
  frame.addEventListener('pointerdown', e => {
    if (!on() || e.button !== 0 || (cover && !cover.hidden)) return;
    if (e.target.closest && e.target.closest('button, input, [role="dialog"], .help')) return;
    const p = at(e);
    if (!CH.box || !CH.hit(p.x, p.y)) return;
    e.preventDefault();
    e.stopPropagation();
    begin(p, e);
  }, true);

  addEventListener('pointermove', e => {
    const p = at(e);
    pointer = p;
    if (grab) {
      if (moved(p)) { e.preventDefault(); return; }
    }
    if (!inside(p) || !on()) { stage.style.cursor = ''; return; }
    stage.style.cursor = grab ? 'grabbing' : CH.hit(p.x, p.y) ? 'grab' : '';
    if (!grab) approach(p);
  }, { passive: false });

  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  addEventListener('blur', end);

  // A click that lands on him is ours: it must not pause or play the video.
  document.addEventListener('click', e => {
    if (!suppress && !on()) return;
    const p = at(e);
    if (suppress || (CH.box && CH.hit(p.x, p.y))) { e.preventDefault(); e.stopPropagation(); }
    suppress = false;
  }, true);

  // Touch: the picture is not a scroll surface while he is grabbable.
  try { stage.style.touchAction = 'none'; } catch {}
})();
