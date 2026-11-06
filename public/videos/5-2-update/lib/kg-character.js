/* moshion-5.1.2-style COPY (MS changes): o.palette {plate, stroke, hair, shirt, pants, blush, sweat, gold} picks the baked
   colours from lib/tokens.js (the shCode Dracula set), and three arm poses are new: 'wave1'/'wave2' (the right hand up, swung
   left/right; alternate them for a wave) and 'pointUp' (the right arm up and out at ~40 degrees, at something above him).
   With no palette and none of the new poses every frame is identical to the shared lib's.

   kg-character.js — the bookSHelf character, as a set of boil frames.

   Adapted from the inline buildJumper() in 1.4_domain_and_range.html. The head
   (bobblehead proportions, quiff, beard, glasses) is that code unchanged and the
   comments explaining WHY each choice is there travelled with it. What is new is
   that the arms are a parameter, because the two style spikes need the character
   doing different things and a second copy of a 100-line rig is how they drift.

   1.4 is NOT rewired to this file. It is a shipped render; rewire it alongside a
   re-render, not before one.

   window.__KGC.frames({w, h, arms, dark, scale, hair}) -> [dataURL, dataURL, dataURL]
   hair: optional [r,g,b] override for quiff and beard (super saiyan blonde, etc).

   Three frames, differing ONLY in the boil seed. Cycle them on a clock derived
   from t and the character breathes without anything moving that means something.
   Put that cycling AFTER the '~BOIL' marker in render()'s signature or the motion
   gate will read shimmer as teaching.

   arms: 'up'    both arms overhead (falling, cheering, objecting)
         'point' right arm out and level, left at side
         'down'  both at side
         'shrug' both out and low, palms up-ish — "well, which one?"
         'cup'   hands together at the right hip — a beam gathering
         'thrust' both arms out along the firing line — a beam released
         'load'   right arm cocked back across the chest — a wind-up
         'sling'  right arm reduced to a stub; the caller draws the rest of it
         'sword'  both hands together high on the right — a blade held back
         'chin'   right hand to the chin — thinking
         'hips'   both hands on the hips — pride, or planting his feet
         'fist'   right fist raised, left on hip — "yes"
         'flinch' both hands up in front of the face — oh no

   expression: the face. OPTIONAL; omitted = the original face (no eyes, default smile), so every
   existing caller is unchanged. Chosen by a deliberate parameter, never by the boil seed, so a change of
   expression is a different picture in all three frames while the boil only wobbles line positions.
         neutral curious delighted confused alarmed smug determined proud surprise
         aha (delighted + lens glint + quiff spring) strain (squeezed eyes, grimace, sweat)
         relief (eyes closed, breath out) sheepish (looks away, blush, sweat drop)
   gaze [gx, gy] each -1|0|1: where the eyes point (eyes exist only when an expression is set).
   tilt: head angle in degrees about the neck (+ = toward his right ear). amp: exaggeration, 1 = normal.
*/
(function(){
var PI = Math.PI;
var PAL = null;   // MS: the palette of the frames() call in progress (drawFace reads it)


// ---- the face: brows, eyes (behind the glasses), mouth, and the small extras ----
// Everything is a few pencil strokes in the same ink as the glasses. Brow and mouth numbers are offsets from
// resting positions, so an expression is a list of numbers rather than new drawing code. `amp` scales them.
function drawFace(s, c, KG, e, gz, amp, dark, INKC, PLATE, cx, hy, r, ly, lw, lh, gap) {
  var GOLD = (PAL && PAL.gold) || (dark ? [232, 176, 74] : [201, 138, 12]), BLUSH = (PAL && PAL.blush) || (dark ? [224, 140, 110] : [200, 90, 70]);
  var lensC = [cx - gap - lw / 2, cx + gap + lw / 2];
  // spec per expression. brow: [outer, mid, inner] dy for the left brow then right (negative = up);
  // eye: dot | big | wide | tiny | closedUp | closedDown | squint | lid | glint
  var X = {
    neutral:    {bl: [0, 0, 0],        br: [0, 0, 0],        bw: 2.0,     eye: 'dot',  mouth: 'smile'},
    curious:    {bl: [3.4, 3, 2.4],    br: [-5, -12, -7],    bw: 3.0, eye: 'dot',  mouth: 'smirkSmall'},   // MS fix round: bolder, to read at 1000 px
    delighted:  {bl: [-3, -5, -3],     br: [-3, -5, -3],     eye: 'big',  mouth: 'grin'},
    confused:   {bl: [2, -1, -5],      br: [-4, -1.5, 1],    eye: 'tiny', mouth: 'wavy'},
    alarmed:    {bl: [-1, -4, -8],     br: [-8, -4, -1],     eye: 'tiny', mouth: 'gritted', sweat: 1},
    smug:       {bl: [2.5, 2, 3.5],    br: [-3.5, -8, -5.5], bw: 2.8, eye: 'lid',  mouth: 'smirk'},   // MS fix round: bolder
    determined: {bl: [-5, 2.5, 9],     br: [9, 2.5, -5],     bw: 3.8,    eye: 'dot',  mouth: 'firm'},   // MS fix round: bolder
    proud:      {bl: [-2, -4, -2.5],   br: [-2, -4, -2.5],   eye: 'closedUp', mouth: 'grinClosed', blush: .35},
    surprise:   {bl: [-5, -8, -6],     br: [-5, -8, -6],     eye: 'wide', mouth: 'O'},
    aha:        {bl: [-3, -6, -4],     br: [-3, -6.5, -4],   eye: 'glint', mouth: 'grin', glint: 1},
    strain:     {bl: [-1, 2, 5],       br: [5, 2, -1],       eye: 'squint', mouth: 'grimace', sweat: 2},
    relief:     {bl: [3.2, -2, -7],    br: [-7, -2, 3.2],    bw: 2.0,   eye: 'closedDown', mouth: 'breath'},
    sheepish:   {bl: [1, -3, -5.5],    br: [-5.5, -3, 1],    eye: 'dot',  mouth: 'wobble', sweat: 1, blush: .55}
  }[e] || {bl: [0, 0, 0], br: [0, 0, 0], eye: 'dot', mouth: 'smile'};
  var k = amp;
  var ink = function(w, a){ return {alpha: a == null ? .95 : a, amp: .35, taper: .25}; };
  var gx = gz[0] * 2.6, gy = gz[1] * 1.8;
  // --- brows, above the lens tops (lens top is ly - lh/2) ---
  var by = ly - lh / 2 - 3.6;
  [[-1, X.bl], [1, X.br]].forEach(function(q){
    var sg = q[0], d = q[1];
    s.stroke([[cx + sg * (gap + lw - .5), by + d[0] * k], [cx + sg * (gap + lw / 2), by + d[1] * k], [cx + sg * (gap + .5), by + d[2] * k]], X.bw || 2.0, ink());
  });
  // --- eyes: drawn inside the lens, so the glasses stay the darkest line on the face ---
  lensC.forEach(function(ex, i){
    var sg = i ? 1 : -1, px = ex + gx, py = ly + gy;
    if (X.eye === 'dot') { dot(px, py, 1.7); }
    else if (X.eye === 'big') { dot(px, py, 2.4); hl(px, py); }
    else if (X.eye === 'glint') { dot(px, py, 2.4); hl(px, py); }
    else if (X.eye === 'tiny') { dot(px, py, 1.0); }
    else if (X.eye === 'wide') { s.stroke(KG.circlePts(ex, ly, 4.3, 3.7, 14, 0).concat([[ex + 4.3, ly]]), 1.3, ink(1, .85)); dot(px * .6 + ex * .4, py, 1.0); }
    else if (X.eye === 'lid') { dot(px + sg * 1.2, py + 1.4, 1.6); s.stroke([[ex - 5.6, ly - 1.2], [ex + 5.6, ly - 1.2]], 3.2, ink()); }   // MS fix round: heavier lid
    else if (X.eye === 'closedUp') { s.stroke(KG.arcPts(ex, ly + 2.2, 4.4, 4.2, 1.15 * PI, 1.85 * PI, 8), 1.9, ink()); }
    else if (X.eye === 'closedDown') { s.stroke(KG.arcPts(ex, ly - 1.8, 4.4, 3.2, .18 * PI, .82 * PI, 8), 1.9, ink()); }
    else if (X.eye === 'squint') {   // > <  squeezed shut
      s.stroke([[ex - sg * 4, ly - 3.2], [ex + sg * 3.2, ly], [ex - sg * 4, ly + 3.2]], 1.9, ink());
    }
  });
  function dot(x, y, rr){ s.poly(KG.circlePts(x, y, rr, rr, 9, 0), true); c.fillStyle = s.colA(INKC, .95); c.fill(); }
  function hl(x, y){ s.poly(KG.circlePts(x + .8, y - .9, .8, .8, 6, 0), true); c.fillStyle = s.colA(PLATE, 1); c.fill(); }
  // --- lens glint: a gold wash, two pale diagonal streaks, a four-point sparkle ---
  if (X.glint) {
    lensC.forEach(function(ex, i){
      var sg = i ? 1 : -1, x0 = ex - 6.5, y0 = ly - 5, x1 = ex + 6.5, y1 = ly + 5;
      s.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true); c.fillStyle = s.colA(GOLD, dark ? .42 : .38); c.fill();
      s.stroke([[ex - 4.2, ly + 3.4], [ex + 1.2, ly - 3.6]], 1.7, {alpha: 1, amp: .2});
      s.stroke([[ex - 1.2, ly + 3.8], [ex + 3.4, ly - 1.6]], 1.2, {alpha: 1, amp: .2});
    });
    // streaks are ink-coloured first, then re-drawn pale on top so they read as light, not as cracks
    c.save(); c.globalCompositeOperation = 'source-over';
    lensC.forEach(function(ex){
      c.strokeStyle = 'rgba(255,252,238,.98)'; c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(ex - 4.2, ly + 3.4); c.lineTo(ex + 1.2, ly - 3.6); c.stroke();
      c.lineWidth = 1.2; c.beginPath(); c.moveTo(ex - 1.2, ly + 3.8); c.lineTo(ex + 3.4, ly - 1.6); c.stroke();
    });
    c.restore();
    var sx = cx + gap + lw + 3.5, sy2 = ly - lh / 2 - 6;
    s.setInk(GOLD);
    s.stroke([[sx - 5, sy2], [sx + 5, sy2]], 1.8, {alpha: 1, amp: .2});
    s.stroke([[sx, sy2 - 5], [sx, sy2 + 5]], 1.8, {alpha: 1, amp: .2});
    s.stroke([[sx - 2.6, sy2 - 2.6], [sx + 2.6, sy2 + 2.6]], 1.2, {alpha: .9, amp: .2});
    s.stroke([[sx + 2.6, sy2 - 2.6], [sx - 2.6, sy2 + 2.6]], 1.2, {alpha: .9, amp: .2});
    s.setInk(INKC);
  }
  // --- mouth, centred at hy + 7.5 ---
  var my = hy + 8, M = {
    smile:      function(){ s.stroke(KG.arcPts(cx, my - .5, 5.2, 3.4, .22 * PI, .78 * PI, 10), 1.7, ink()); },
    smirkSmall: function(){ s.stroke([[cx - 4, my + 1.4], [cx, my + 1.6], [cx + 4.5, my - .8 * k]], 1.7, ink()); },
    smirk:      function(){ s.stroke([[cx - 4.5, my + 1.4], [cx - 1, my + 2.2], [cx + 3, my + 1.2], [cx + 6, my - 1.6 * k]], 1.8, ink()); },
    grin:       function(){ var p = KG.arcPts(cx, my - 1.8, 6.6, 5.4 * Math.min(1.25, k), .04 * PI, .96 * PI, 12);
                  s.poly(p, true); c.fillStyle = s.colA(INKC, .88); c.fill(); s.stroke(p.concat([p[0]]), 1.5, ink()); },
    grinClosed: function(){ s.stroke(KG.arcPts(cx, my - 2.4, 7.4, 5.2 * Math.min(1.2, k), .1 * PI, .9 * PI, 12), 1.9, ink()); },
    wavy:       function(){ var p = []; for (var i = 0; i <= 12; i++) { var u = i / 12; p.push([cx - 6 + 12 * u, my + 1.5 + Math.sin(u * 3 * PI) * 1.7 * k]); } s.stroke(p, 1.7, ink()); },
    gritted:    function(){ var x0 = cx - 6, x1 = cx + 6, y0 = my - 1.5, y1 = my + 3.8; s.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true);
                  c.fillStyle = s.colA(PLATE, 1); c.fill(); s.stroke([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], 1.6, ink());
                  for (var i = 1; i < 4; i++) s.stroke([[x0 + i * 3, y0], [x0 + i * 3, y1]], 1.0, {alpha: .7, amp: .1});
                  s.stroke([[x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2]], 1.0, {alpha: .7, amp: .1}); },
    firm:       function(){ s.stroke([[cx - 5, my + 1.2], [cx, my + .8], [cx + 5, my + 1.2]], 2.0, ink()); s.stroke([[cx - 5, my + 1.2], [cx - 6.4, my + 2.6]], 1.5, ink()); s.stroke([[cx + 5, my + 1.2], [cx + 6.4, my + 2.6]], 1.5, ink()); },
    O:          function(){ var p = KG.circlePts(cx, my + 1.2, 3.3 * Math.min(1.2, k), 4.4 * Math.min(1.2, k), 12, 0); s.poly(p, true); c.fillStyle = s.colA(INKC, .88); c.fill(); s.stroke(p.concat([p[0]]), 1.4, ink()); },
    grimace:    function(){ var p = []; for (var i = 0; i <= 10; i++) { var u = i / 10; p.push([cx - 6.4 + 12.8 * u, my + 2 + (i % 2 ? -1.5 : 1.3)]); } s.stroke(p, 1.8, ink()); },
    breath:     function(){ var p = KG.circlePts(cx, my + 1.4, 2.4, 2.8, 10, 0); s.poly(p, true); c.fillStyle = s.colA(INKC, .8); c.fill(); s.stroke(p.concat([p[0]]), 1.3, ink());
                  [[-1, 5], [0, 6.4], [1, 5]].forEach(function(q, i){ s.stroke([[cx + 6 + i * 2, my + 1 + q[0] * 2], [cx + 11 + i * 2, my + 1 + q[0] * 3.4]], 1.1, {alpha: .55, amp: .15}); }); },
    wobble:     function(){ var p = []; for (var i = 0; i <= 12; i++) { var u = i / 12; p.push([cx - 5.5 + 11 * u, my + 1.6 + Math.sin(u * 4 * PI) * 1.0 - (u > .8 ? (u - .8) * 5 : 0)]); } s.stroke(p, 1.7, ink()); }
  };
  (M[X.mouth] || M.smile)();
  if (X.blush) {
    s.setInk(BLUSH);
    [-1, 1].forEach(function(sg){
      for (var i = 0; i < 4; i++) s.stroke([[cx + sg * (11 + i * 1.6) - 1.5, ly + 7.6], [cx + sg * (11 + i * 1.6) + 1.6, ly + 4.6]], 1.2, {alpha: X.blush * 1.3, amp: .2});
    });
    s.setInk(INKC);
  }
  if (X.sweat) {   // a drop at the temple (and a second, lower, for real strain)
    var SW = (PAL && PAL.sweat) || (dark ? [143, 176, 205] : [61, 90, 128]);
    [[cx + r - 1, ly - 9.5], [cx + r + 3, ly - 1]].slice(0, X.sweat).forEach(function(q, i){
      var x = q[0], y = q[1], dd = [[x, y - 4.2], [x + 2.4, y + .8], [x, y + 3.4], [x - 2.4, y + .8], [x, y - 4.2]];
      s.poly(dd, true); c.fillStyle = s.colA(SW, .55); c.fill(); s.setInk(SW); s.stroke(dd, 1.3, {alpha: .95, amp: .2}); s.setInk(INKC);
    });
  }
}

function frames(o){
  var w = o.w || 92, h = o.h || 118, arms = o.arms || 'down';
  var dark = !!o.dark, S = o.scale || 3;
  var expr = o.expression || '', gz = o.gaze || [0, 0], tilt = (o.tilt || 0) * PI / 180, amp = o.amp == null ? 1 : o.amp;
  var KG = window.__KG;
  if (!KG) throw new Error('kg-character.js requires kg-sketch.js to load first');
  PAL = o.palette || null;
  var out = [];
  for (var k = 0; k < 3; k++) {
    var s = new KG.Sketch(w * S, h * S);
    s.boil(k + 1);                       // the ONLY difference between frames
    var c = s.ctx; c.save(); c.scale(S, S);

    // THEME-AWARE PLATE. Boil frames are rasters: paper fill and ink are baked
    // into pixels and cannot follow a CSS token. On the dark pass a light face
    // plate reads as a white blob and dark strokes vanish. Resolve at build time.
    var PLATE  = (PAL && PAL.plate) || (dark ? [38, 36, 29]   : [246, 241, 229]);
    var STROKE = (PAL && PAL.stroke) || (dark ? [250, 249, 245] : [31, 29, 26]);
    // Hair is a PARAMETER so a transformation can recolour it. The super saiyan
    // power-up needs blonde, and repainting the quiff from outside is impossible:
    // the boil frames are rasters, so the colour has to be chosen before they are
    // drawn. Defaults are unchanged, so every existing caller is unaffected.
    var HAIR   = o.hair || (PAL && PAL.hair) || (dark ? [196, 138, 92]  : [150, 96, 58]);
    // Garments are washes, not flats — same translucent-pencil treatment as the
    // beard and quiff. A flat fill at this size reads as a coloured rectangle
    // stuck to the body rather than as cloth. SHIRT is the book's own accent
    // blue, which ties the character to the page it lives on.
    var SHIRT  = (PAL && PAL.shirt) || (dark ? [143, 176, 205] : [78, 110, 142]);
    var PANTS  = (PAL && PAL.pants) || (dark ? [168, 161, 148] : [70, 66, 58]);
    s.setInk(STROKE);

    var cx = w / 2, hy = 32, r = 20;

    // Bobblehead proportions, deliberately. A realistic head at this size is
    // ~30px on screen and glasses+beard+quiff cannot all read inside it.
    // HEAD BLOCK: everything from the face plate to the mouth rotates about the neck for a head tilt.
    c.save(); c.translate(cx, hy + r); c.rotate(tilt); c.translate(-cx, -(hy + r));
    var face = s.blobPts(cx, hy, r, r * 1.06, 0, .30);
    s.poly(face, true); c.fillStyle = s.colA(PLATE, 1); c.fill();

    // beard: DRAWN, not filled. A flat fill reads as "the lower half of the face
    // is a different colour" rather than as hair.
    var jaw = KG.arcPts(cx, hy + 2, r * .96, r * 1.02, .08 * PI, .92 * PI, 18);
    s.poly(jaw.concat([[cx + r * .86, hy + r * .06], [cx - r * .86, hy + r * .06]]), true);
    c.fillStyle = s.colA(HAIR, dark ? .20 : .26); c.fill();
    var bJaw = KG.arcPts(cx, hy + 2, r * .96, r * 1.02, .08 * PI, .92 * PI, 30);
    for (var bi = 0; bi < bJaw.length; bi++) {
      var bp = bJaw[bi], bt = bi / (bJaw.length - 1);
      var vx = bp[0] - cx, vy = bp[1] - (hy + 2);
      var i0 = .50 + .16 * Math.sin(bt * PI) + s.jr(-.06, .06);
      var i1 = .98 + s.jr(-.05, .04);
      s.sline([[cx + vx * i0, hy + 2 + vy * i0], [cx + vx * i1, hy + 2 + vy * i1]],
              s.jr(.9, 1.6), s.jr(.40, .78), s.colA(HAIR, s.jr(.55, .9)));
    }
    s.stroke(jaw, 1.7, {alpha: .5});

    // hair: an actual swept quiff, peaked and off-centre
    var crown = KG.arcPts(cx, hy, r * 1.0, r * 1.06, 1.04 * PI, 1.96 * PI, 16);
    s.poly(crown.concat([[cx + r * .96, hy - r * .30], [cx + r * .46, hy - r - 4],
                         [cx - r * .06, hy - r - 7], [cx - r * .80, hy - r * .30]]), true);
    c.fillStyle = s.colA(HAIR, .80); c.fill();
    s.stroke([[cx - r * .90, hy - r * .28], [cx - r * .25, hy - r - 5],
              [cx + r * .50, hy - r - 3], [cx + r * .95, hy - r * .20]], 1.8, {alpha: .8});

    if (expr === 'aha') {   // the quiff springs up: two extra strokes of the same hair, standing off the peak
      [[-.2, -.1], [.28, .2]].forEach(function(q){
        var bx = cx + r * (.18 + q[0] * .5), by = hy - r - 5;
        s.sline([[bx, by], [bx + 3 + q[1] * 8, by - 8], [bx + 7 + q[1] * 10, by - 12]], 1.9, .85, HAIR);
        s.stroke([[bx, by], [bx + 3 + q[1] * 8, by - 8], [bx + 7 + q[1] * 10, by - 12]], 1.7, {alpha: .8, amp: .5});
      });
    }

    s.stroke(face.concat([face[0]]), 1.9, {alpha: .9});

    // glasses: darkest ink on the page
    var ly = hy + 1, lw = 13, lh = 10, gap = 3.2;
    [-1, 1].forEach(function(sgn){
      var x0 = cx + sgn * gap, x1 = cx + sgn * (gap + lw);
      s.stroke([[x0, ly - lh / 2], [x1, ly - lh / 2], [x1, ly + lh / 2],
                [x0, ly + lh / 2], [x0, ly - lh / 2]], 2.1, {alpha: 1});
    });
    s.stroke([[cx - gap, ly - 2], [cx + gap, ly - 2]], 1.8, {alpha: 1});
    s.stroke([[cx - gap - lw, ly - 1.5], [cx - r + 1, ly + 1]], 1.6, {alpha: .8});
    s.stroke([[cx + gap + lw, ly - 1.5], [cx + r - 1, ly + 1]], 1.6, {alpha: .8});

    // mouth, drawn AFTER the beard fill so it is not buried by it
    if (!expr) s.stroke(KG.arcPts(cx, hy + 7.5, 5.2, 3.4, .22 * PI, .78 * PI, 10), 1.7, {alpha: .9});
    else drawFace(s, c, KG, expr, gz, amp, dark, STROKE, PLATE, cx, hy, r, ly, lw, lh, gap);
    c.restore();   // end of head block

    // ---- body ----
    var ny = hy + r + 1, sy = hy + r + 8, wy = hy + r + 28;   // neck, shoulders, waist
    s.stroke([[cx, ny], [cx, sy]], 1.9, {alpha: .85});

    // ---- clothes ----
    // The torso is TWENTY pixels tall (sy..wy). That is the whole design
    // constraint: anything with interior detail turns to mud, so the garments
    // are silhouette plus one graphic and nothing else. Same lesson the head
    // learned when glasses+beard+quiff would not fit a realistic skull.
    //
    // Drawn BEFORE the torso and arm strokes so the ink lines sit on top of the
    // cloth rather than being buried by the fill.

    // legs first: trousers then cover them, and only the shins below the hem show.
    s.stroke([[cx, wy], [cx - 8, wy + 14]], 2.1, {alpha: .9});
    s.stroke([[cx, wy], [cx + 8, wy + 14]], 2.1, {alpha: .9});

    var trous = [[cx - 7.5, wy - 3], [cx + 7.5, wy - 3], [cx + 8, wy + 9],
                 [cx + 3.4, wy + 9], [cx + 1, wy + 1], [cx - 1, wy + 1],
                 [cx - 3.4, wy + 9], [cx - 8, wy + 9]];
    s.poly(trous, true); c.fillStyle = s.colA(PANTS, dark ? .50 : .62); c.fill();
    s.stroke(trous.concat([trous[0]]), 1.6, {alpha: .7});

    // torso line goes under the shirt fill so the tee does not read as two panels
    s.stroke([[cx, sy], [cx, wy]], 2.3, {alpha: .9});

    // tee: a slight neck dip, a gentle taper to the hem
    var tee = [[cx - 9, sy + 1], [cx - 3.2, sy + 2.4], [cx, sy + 4.2],
               [cx + 3.2, sy + 2.4], [cx + 9, sy + 1],
               [cx + 8, wy + 1.5], [cx - 8, wy + 1.5]];
    s.poly(tee, true); c.fillStyle = s.colA(SHIRT, dark ? .46 : .55); c.fill();
    s.stroke(tee.concat([tee[0]]), 1.7, {alpha: .8});

    // short sleeves only. A long sleeve would have to deform along every arm
    // pose in the A table below; a cap sits at the shoulder and is pose-agnostic.
    [-1, 1].forEach(function(sg){
      var sl = [[cx + sg * 8.6, sy + 1.4], [cx + sg * 13.6, sy + 4.2],
                [cx + sg * 12.4, sy + 10], [cx + sg * 7.6, sy + 8]];
      s.poly(sl, true); c.fillStyle = s.colA(SHIRT, dark ? .52 : .62); c.fill();
      s.stroke(sl.concat([sl[0]]), 1.5, {alpha: .75});
    });

    // ---- arms, drawn LAST so they sit on top of the garment ----
    // Two earlier attempts were wrong in opposite directions, both visible only
    // in a render:
    //   1. first point at the sternum (x = +/-.5), arms on top  -> a line cutting
    //      diagonally across the shirt;
    //   2. same points, arms UNDER the shirt                    -> the 'down' pose
    //      lost its arms entirely, because that pose hangs them at x = 9..11 and
    //      the tee silhouette is 9 tapering to 8. The limb was inside the garment.
    // So: start each limb at the SLEEVE HEM, and swing the hanging poses wide
    // enough to clear the shirt edge. The first point is the sleeve's inner-bottom
    // corner (+/-7.6, sy+8) — the same corner the sleeve poly above ends on, so
    // the two cannot drift apart.
    //
    // Points are offsets from the SHOULDER (sy), the way 1.4 wrote them. Anything
    // measured from the head instead drifts the moment the head resizes.
    var A = {
      up:    [[[-7.6, 7.6], [-11,   1], [-15, -7]], [[7.6, 7.6], [11,   1], [15, -7]]],
      down:  [[[-7.6, 8.4], [-10.5, 17], [-12, 26]], [[7.6, 8.4], [10.5, 17], [12, 26]]],
      point: [[[-7.6, 8.4], [-10.5, 17], [-11, 25]], [[7.6, 7.6], [13,   4], [22,  3]]],
      shrug: [[[-7.6, 8.0], [-13,  13], [-17,  8]], [[7.6, 8.0], [13,  13], [17,  8]]],
      // A beam needs two poses the table did not have: hands cupped together at
      // one hip to gather, then both arms thrust out along the firing line. Both
      // hands must MEET, or the charge sphere has nowhere to sit.
      cup:   [[[-7.6, 8.4], [  2, 16], [ 12, 17]], [[7.6, 8.4], [12, 14], [14, 17]]],
      thrust:[[[-7.6, 7.6], [  6,  9], [ 20,  6]], [[7.6, 7.6], [14,  7], [22,  6]]],
      // A gum-gum is the character's OWN arm leaving, so the rig has to be able
      // to hand the arm over rather than have a second one drawn beside it.
      //   load  — cocked back across the chest, the wind-up before the shot.
      //   sling — the right arm reduced to a short stub at the shoulder; the
      //           caller draws the rest of that same limb out to wherever it is
      //           reaching. Without this the pose keeps its full arm and the
      //           stretched one reads as a spare limb growing from the shoulder.
      // Both keep the left arm hanging, so the silhouette still reads as him.
      load:  [[[-7.6, 8.4], [-10.5, 17], [-12, 26]], [[7.6, 7.6], [  1,  4], [ -7,  1]]],
      sling: [[[-7.6, 8.4], [-10.5, 17], [-12, 26]], [[7.6, 7.6], [ 12,  5], [ 16,  3]]],
      // Two hands meeting high on the right, for a blade held back before a swing.
      sword: [[[-7.6, 7.6], [  2, -2], [ 11, -8]],   [[7.6, 7.6], [ 12,  0], [ 14, -8]]],
      chin:  [[[-7.6, 8.4], [-10.5, 17], [-12, 26]], [[7.6, 7.6], [ 15,  3], [  7, -5]]],
      hips:  [[[-7.6, 8.0], [-15, 12], [ -9, 19]],   [[7.6, 8.0], [ 15, 12], [  9, 19]]],
      fist:  [[[-7.6, 8.0], [-15, 12], [ -9, 19]],   [[7.6, 7.6], [ 13,  0], [ 14, -10]]],
      flinch:[[[-7.6, 8.0], [-12,  3], [ -6, -6]],   [[7.6, 8.0], [ 12,  3], [  6, -6]]],
      // MS: a wave is two frames of the same raised right arm, the hand swung left then right; alternate them on the beat clock.
      // (the hand stays clear of the bobblehead, radius 20, or at small size it reads as a hand on the face)
      wave1: [[[-7.6, 8.4], [-10.5, 17], [-11, 25]], [[7.6, 7.6], [ 17,  0], [ 25, -11]]],
      wave2: [[[-7.6, 8.4], [-10.5, 17], [-11, 25]], [[7.6, 7.6], [ 18,  2], [ 30,  -4]]],
      // MS: point at something ABOVE him (a line of code higher up the stage): the right arm up and out at ~40 degrees.
      pointUp: [[[-7.6, 8.4], [-10.5, 17], [-11, 25]], [[7.6, 7.6], [ 15,  1], [ 24, -8]]]
    }[arms] || [];
    A.forEach(function(limb){
      s.stroke(limb.map(function(p){ return [cx + p[0], sy + p[1]]; }), 2.1, {alpha: .9});
    });
    if (arms === 'wave1' || arms === 'wave2' || arms === 'pointUp') {   // MS: a small open hand at the tip, so the gesture reads at small size
      var hp = A[1][2], hc = KG.circlePts(cx + hp[0], sy + hp[1], 2.2, 2.2, 10, 0);
      s.poly(hc, true); c.fillStyle = s.colA(PLATE, 1); c.fill(); s.stroke(hc.concat([hc[0]]), 1.4, {alpha: .9});
    }
    if (arms === 'fist') {   // a clenched hand at the raised tip
      var fp = A[1][2]; s.poly(KG.circlePts(cx + fp[0], sy + fp[1] - 1, 2.6, 2.6, 10, 0), true);
      c.fillStyle = s.colA(STROKE, .85); c.fill();
    }

    c.restore();
    out.push(s.canvas.toDataURL());
  }
  return out;
}

window.__KGC = {frames: frames};
})();
