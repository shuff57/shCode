// Assertions for lib/camera-fit.ts, run against a CommonJS build by
// scripts/test-camera-fit.mjs.
//
// This is the pure math behind Home's "fit the model" behaviour in
// components/model/BrepViewportThree.tsx: given a bounding box, a viewport
// size, and a vertical field of view, how far back the camera has to sit so
// the box's longest dimension fills ~45% of the viewport's shorter side.

module.exports = function run(dir) {
  const path = require('path');
  const fit = require(path.join(dir, 'camera-fit.js'));

  let pass = 0;
  const fails = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fails.push(name); console.log(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`); }
  };
  const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

  // A 40 x 40 x 20 box centred on the origin -- the app's own default box.
  const box40 = { min: [-20, -20, -10], max: [20, 20, 10] };

  console.log('\n=== bboxCenter / bboxLongestDimension ===');

  check('centre of a box centred on the origin is the origin',
    JSON.stringify(fit.bboxCenter(box40)) === JSON.stringify([0, 0, 0]));
  check('centre of an off-origin box is its midpoint, not the origin',
    JSON.stringify(fit.bboxCenter({ min: [-20, -20, -10], max: [20, 20, 30] })) === JSON.stringify([0, 0, 10]));
  check('longest dimension of the 40x40x20 box is 40 (width/depth, not height)',
    fit.bboxLongestDimension(box40) === 40);
  check('longest dimension picks whichever axis is actually biggest',
    fit.bboxLongestDimension({ min: [0, 0, 0], max: [5, 5, 41] }) === 41);

  console.log('\n=== fitDistance: landscape (the app\'s own viewport shape) ===');

  // Landscape viewport (width >= height): the vertical fov alone limits what
  // fits, independent of exactly how wide the canvas is -- see the function's
  // own doc comment for why the formula does not otherwise depend on aspect.
  const dLandscape = fit.fitDistance(box40, 1164, 662, 45);
  // 40 / (2 * 0.45 * tan(22.5deg)) = 40 / (0.9 * 0.4142135...) = ~107.297
  check('40mm box, 1164x662 viewport, 45deg fov, default 45% fill -> ~107.3',
    close(dLandscape, 40 / (0.9 * Math.tan(Math.PI / 8)), 1e-4), String(dLandscape));

  const dSquare = fit.fitDistance(box40, 900, 900, 45);
  check('a square viewport (aspect exactly 1) takes the landscape branch, same distance',
    close(dSquare, dLandscape, 1e-9), `${dSquare} vs ${dLandscape}`);

  const dWide = fit.fitDistance(box40, 3000, 662, 45);
  check('a MUCH wider viewport at the same height gives the identical distance -- width never enters the landscape formula',
    close(dWide, dLandscape, 1e-9), `${dWide} vs ${dLandscape}`);

  console.log('\n=== fitDistance: portrait ===');

  const dPortrait = fit.fitDistance(box40, 600, 1000, 45);
  // tan(shortSideHalf) = tan(verticalHalf) * aspect exactly, by construction
  // -- see the function's own comment -- so this simplifies cleanly.
  const expectedPortrait = 40 / (2 * 0.45 * Math.tan(Math.PI / 8) * 0.6);
  check('portrait viewport (width < height) uses the narrower horizontal half-angle',
    close(dPortrait, expectedPortrait, 1e-4), String(dPortrait));
  check('the SAME box needs a bigger distance in portrait than in landscape (less room on the short side)',
    dPortrait > dLandscape);

  console.log('\n=== fitDistance: fillFraction and fov scale as expected ===');

  const dHalfFill = fit.fitDistance(box40, 1164, 662, 45, 0.225);
  check('halving the fill fraction doubles the distance',
    close(dHalfFill, dLandscape * 2, 1e-4), `${dHalfFill} vs ${dLandscape * 2}`);

  const dDoubleLongest = fit.fitDistance({ min: [-40, -40, -10], max: [40, 40, 10] }, 1164, 662, 45);
  check('doubling the longest dimension doubles the distance',
    close(dDoubleLongest, dLandscape * 2, 1e-4), `${dDoubleLongest} vs ${dLandscape * 2}`);

  const dWideFov = fit.fitDistance(box40, 1164, 662, 90);
  // tan(45deg) == 1 exactly, so this one has a clean closed form: 40 / (2*0.45) = 44.444...
  check('a 90deg fov (tan(45deg)=1) gives the closed-form 40 / 0.9',
    close(dWideFov, 40 / 0.9, 1e-9), String(dWideFov));
  check('a WIDER fov needs a SMALLER distance to fill the same fraction of screen',
    dWideFov < dLandscape);

  console.log('\n=== fitDistance: degenerate inputs never divide toward zero or blow up ===');

  check('a single-point bbox (nothing built yet) floors at MIN_FIT_DISTANCE',
    fit.fitDistance({ min: [5, 5, 5], max: [5, 5, 5] }, 1164, 662, 45) === fit.MIN_FIT_DISTANCE);
  check('a zero-width viewport floors at MIN_FIT_DISTANCE rather than dividing by zero',
    fit.fitDistance(box40, 0, 662, 45) === fit.MIN_FIT_DISTANCE);
  check('a zero-height viewport floors at MIN_FIT_DISTANCE rather than dividing by zero',
    fit.fitDistance(box40, 1164, 0, 45) === fit.MIN_FIT_DISTANCE);
  check('a zero fill fraction floors at MIN_FIT_DISTANCE rather than dividing by zero',
    fit.fitDistance(box40, 1164, 662, 45, 0) === fit.MIN_FIT_DISTANCE);
  check('a real result is never below the floor even for a tiny box',
    fit.fitDistance({ min: [0, 0, 0], max: [0.001, 0.001, 0.001] }, 1164, 662, 45) === fit.MIN_FIT_DISTANCE);

  console.log('\n=== fitDistance: occludedWidth -- a docked panel eating part of the canvas ===');

  {
    // A Rules panel eating 300px of a 1164px-wide, 662px-tall canvas leaves
    // 864px visible -- still landscape (864 > 662), so the vertical-fov-only
    // formula still applies and the distance should be IDENTICAL to a plain
    // 864-wide canvas with no occlusion at all.
    const dOccluded = fit.fitDistance(box40, 1164, 662, 45, undefined, 300);
    const dPlain864 = fit.fitDistance(box40, 864, 662, 45);
    check('occluding 300px of a 1164px canvas gives the SAME distance as a plain 864px canvas (still landscape)',
      close(dOccluded, dPlain864, 1e-9), `${dOccluded} vs ${dPlain864}`);
    // Height is still the limiting side (864 > 662), so this is IDENTICAL to
    // the unoccluded distance too -- the landscape formula never depended on
    // width to begin with (see the "MUCH wider viewport" case above). The
    // model's on-screen SIZE in pixels does not need to change just because
    // a panel narrowed the strip it sits in; it now simply reads as a bigger
    // fraction of that narrower strip, which is the whole point of the fix.
    check('while still landscape, occluding width changes nothing -- height alone governs, exactly as the unoccluded case already does',
      close(dOccluded, dLandscape, 1e-9), `${dOccluded} vs ${dLandscape}`);
  }
  {
    // Occlusion big enough to flip landscape into portrait: 1164 - 700 = 464,
    // narrower than the 662px height.
    const dFlipped = fit.fitDistance(box40, 1164, 662, 45, undefined, 700);
    const dPortraitEquivalent = fit.fitDistance(box40, 464, 662, 45);
    check('enough occlusion flips the aspect branch to portrait, matching a plain 464-wide portrait canvas',
      close(dFlipped, dPortraitEquivalent, 1e-9), `${dFlipped} vs ${dPortraitEquivalent}`);
  }
  check('occludedWidth omitted defaults to 0 -- identical to the unoccluded distance',
    close(fit.fitDistance(box40, 1164, 662, 45, undefined), dLandscape, 1e-9));
  check('a negative occludedWidth is treated as zero, not as ADDING visible space',
    close(fit.fitDistance(box40, 1164, 662, 45, undefined, -500), dLandscape, 1e-9));
  check('an occludedWidth >= the whole viewport floors the visible width at 1px rather than going negative or zero',
    Number.isFinite(fit.fitDistance(box40, 1164, 662, 45, undefined, 5000)));

  console.log(fails.length === 0
    ? `\nall ${pass} checks passed`
    : `\n${fails.length} failed`);
  return fails.length === 0;
};
