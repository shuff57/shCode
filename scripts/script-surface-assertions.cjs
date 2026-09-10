// Assertions for lib/script-surface.ts, run by scripts/test-script-surface.mjs.
//
// The classification is a set of CLAIMS, and a claim nobody can fail is not a
// claim. Three kinds of check here:
//
//   SHAPE     a verdict has to carry what the verdict implies -- a refusal names
//             what would lift it, a name that needs no work names none.
//   MEANING   blockedNames and whyNotPortable have to separate the two refusals,
//             because one is geometry we owe and the other is a build config
//             line, and a message that blurs them sends someone to the wrong
//             week of work.
//   CONTROL   each of those, paired with an input the lazy implementation gets
//             wrong.
//
// What is NOT here: whether the OpenCascade exports each verdict names actually
// exist. That needs the kernel, and it is asserted in
// scripts/test-occt-adapter.mjs -- present for every name claimed present, and
// ABSENT for every name claimed missing, so a build that starts binding
// GTransform turns this classification red instead of leaving `scale` refused
// out of habit.

module.exports = function run({ surface, check }) {
  const { SURFACE, verdictFor, blockedNames, unclassified, whyNotPortable, isBlocking } = surface;

  console.log('\n=== the shape of a verdict ===');

  check('every name appears exactly once',
    new Set(SURFACE.map((e) => e.name)).size === SURFACE.length,
    'duplicate: ' + SURFACE.map((e) => e.name)
      .filter((n, i, a) => a.indexOf(n) !== i).join(', '));

  const VALID = ['exact', 'recipe', 'ours', 'moot', 'unbound', 'absent'];
  check('every verdict is one of the six',
    SURFACE.every((e) => VALID.includes(e.serves)),
    SURFACE.filter((e) => !VALID.includes(e.serves)).map((e) => e.name + '=' + e.serves).join(', '));

  // Every entry says something, and every REFUSAL says something substantial.
  // The floor is split rather than uniform because a short note is only a
  // problem for some verdicts. "Arithmetic." is the complete and correct note
  // for hslToRgb and "A polygon of three." is the whole of triangle's recipe;
  // padding either to reach a length would make the field worse. A refusal
  // explained in one word is an opinion, and this is the field that has to
  // carry the evidence.
  check('every entry carries a note, written as a sentence',
    SURFACE.every((e) => typeof e.note === 'string' && /^\S.*[.]$/.test(e.note)),
    SURFACE.filter((e) => !/^\S.*[.]$/.test(e.note || '')).map((e) => e.name).join(', '));
  // A refusal argues at length, or names the sibling that does the arguing for
  // it. Both are allowed; silence is not.
  const argues = (e) => e.note.length > 80 || typeof e.sameAs === 'string';
  check('...and every REFUSAL either argues itself or names who argues for it',
    SURFACE.filter((e) => isBlocking(e.serves)).every(argues),
    SURFACE.filter((e) => isBlocking(e.serves) && !argues(e)).map((e) => e.name).join(', '));

  // The control on that escape hatch: an inherited argument has to lead
  // somewhere real. The target must exist, must itself be a refusal, must argue
  // at length on its own, and must not just point onward -- otherwise `sameAs`
  // becomes a way to have five refusals and no evidence.
  const heirs = SURFACE.filter((e) => e.sameAs);
  check('CONTROL: every inherited argument lands on one that is really made',
    heirs.every((e) => {
      const src = verdictFor(e.sameAs);
      return src && isBlocking(src.serves) && src.note.length > 80 && !src.sameAs;
    }),
    heirs.filter((e) => {
      const src = verdictFor(e.sameAs);
      return !(src && isBlocking(src.serves) && src.note.length > 80 && !src.sameAs);
    }).map((e) => `${e.name} -> ${e.sameAs}`).join(', '));
  check('...and only a refusal inherits one',
    SURFACE.filter((e) => e.sameAs).every((e) => isBlocking(e.serves)),
    SURFACE.filter((e) => e.sameAs && !isBlocking(e.serves)).map((e) => e.name).join(', '));

  // A refusal that does not say what would lift it is an opinion. A recipe that
  // does not say what it is built from is a promise.
  const owes = SURFACE.filter((e) => ['recipe', 'unbound', 'absent'].includes(e.serves));
  check('every recipe, unbound and absent name says what it still needs',
    owes.every((e) => typeof e.needs === 'string' && e.needs.length > 5),
    owes.filter((e) => !e.needs).map((e) => e.name).join(', '));

  // ...and the other direction, which is the control: a name that needs nothing
  // must not carry a `needs`, or the field stops meaning anything.
  const free = SURFACE.filter((e) => ['exact', 'ours', 'moot'].includes(e.serves));
  check('CONTROL: a name that needs nothing carries no needs',
    free.every((e) => e.needs === undefined),
    free.filter((e) => e.needs).map((e) => e.name).join(', '));

  // Every 'ours' and 'moot' name is one we can serve with no kernel at all, so
  // naming an OpenCascade export beside it would be noise pretending to be
  // evidence.
  check('nothing served without a kernel cites a kernel export',
    SURFACE.filter((e) => ['ours', 'moot'].includes(e.serves)).every((e) => e.kernel === undefined),
    SURFACE.filter((e) => ['ours', 'moot'].includes(e.serves) && e.kernel)
      .map((e) => e.name).join(', '));

  // `kernel` and `absent` are two different claims and the split was earned:
  // hull's recipe needs BRepBuilderAPI_Sewing, which is PRESENT, while what
  // refuses hull is a whole missing algorithm that is not an export at all.
  // Holding both meanings in one field made the OCCT suite blame Sewing for
  // hull's refusal, which is how the flaw surfaced.
  check('no name asks for the same export to be both present and missing',
    SURFACE.every((e) => !(e.kernel || []).some((k) => (e.absent || []).includes(k))),
    SURFACE.filter((e) => (e.kernel || []).some((k) => (e.absent || []).includes(k)))
      .map((e) => e.name).join(', '));
  check('only a refusal blames a missing export',
    SURFACE.filter((e) => e.absent).every((e) => isBlocking(e.serves)),
    SURFACE.filter((e) => e.absent && !isBlocking(e.serves)).map((e) => e.name).join(', '));
  check('hull cites Sewing as something it USES, never as what refuses it',
    verdictFor('hull').kernel.includes('BRepBuilderAPI_Sewing')
      && verdictFor('hull').absent === undefined);
  check('...while the unbound names all blame the one binding by name',
    SURFACE.filter((e) => e.serves === 'unbound')
      .every((e) => (e.absent || []).includes('BRepBuilderAPI_GTransform')),
    SURFACE.filter((e) => e.serves === 'unbound'
      && !(e.absent || []).includes('BRepBuilderAPI_GTransform')).map((e) => e.name).join(', '));

  console.log('\n=== the two refusals are kept apart ===');

  check('hull is absent -- OpenCascade has no such operation',
    verdictFor('hull').serves === 'absent');
  check('scale is unbound -- OpenCascade has it, this build does not bind it',
    verdictFor('scale').serves === 'unbound');
  check('...and both are blocking, so a gate treats them alike',
    isBlocking('absent') && isBlocking('unbound'));
  check('...while recipe, ours and moot are not',
    !isBlocking('recipe') && !isBlocking('ours') && !isBlocking('moot'));

  check('the sentence for an absent name says we have to own it',
    /own it/.test(whyNotPortable(['hull', 'cuboid'])),
    String(whyNotPortable(['hull', 'cuboid'])));
  check('the sentence for an unbound name says the BUILD has to expose it',
    /wasm build/.test(whyNotPortable(['scale', 'cuboid'])),
    String(whyNotPortable(['scale', 'cuboid'])));
  check('...and an example hitting both gets both halves, not one',
    /own it/.test(whyNotPortable(['hull', 'scale']))
      && /wasm build/.test(whyNotPortable(['hull', 'scale'])),
    String(whyNotPortable(['hull', 'scale'])));
  check('CONTROL: a portable example gets no sentence at all',
    whyNotPortable(['cuboid', 'translate', 'union', 'measureVolume', 'colorize']) === null,
    String(whyNotPortable(['cuboid', 'translate', 'union', 'measureVolume', 'colorize'])));

  console.log('\n=== the scale finding, which is the one nobody predicted ===');

  // Written as an assertion rather than a paragraph, because the whole reason it
  // was found is that nobody thought to look.
  check('scaleZ is blocked too -- one axis IS the non-uniform case',
    verdictFor('scaleZ').serves === 'unbound');
  check('transform is blocked -- a raw 4x4 is the general case of the same wall',
    verdictFor('transform').serves === 'unbound');
  check('ellipsoid is blocked, and for the SAME reason, not a new one',
    verdictFor('ellipsoid').serves === 'unbound'
      && verdictFor('ellipsoid').needs.includes('GTransform'),
    verdictFor('ellipsoid').needs);
  check('CONTROL: ellipse is NOT blocked -- a 2D ellipse is a curve, not a stretch',
    verdictFor('ellipse').serves === 'exact');
  check('CONTROL: translate, which looks the same from outside, is exact',
    verdictFor('translate').serves === 'exact');
  check('all four unbound names name the one binding that would fix them',
    SURFACE.filter((e) => e.serves === 'unbound')
      .every((e) => e.needs.includes('GTransform')),
    SURFACE.filter((e) => e.serves === 'unbound' && !e.needs.includes('GTransform'))
      .map((e) => e.name).join(', '));

  console.log('\n=== the mesh-repair module retires rather than refusing ===');

  // Three names that were on the "13 mesh-only API names each need a decision"
  // list. The decision is that they have nothing left to do, which is different
  // from being refused -- nothing is lost and nothing is owed.
  for (const n of ['generalize', 'snap', 'retessellate']) {
    check(`${n} is moot, not refused`, verdictFor(n).serves === 'moot');
  }
  check('...so none of them blocks an example',
    blockedNames(['generalize', 'snap', 'retessellate']).length === 0);

  console.log('\n=== an unjudged name is a failure, not a default ===');

  check('a name nobody has classified is reported',
    unclassified(['cuboid', 'sphere', 'somethingNew']).join(',') === 'somethingNew',
    unclassified(['cuboid', 'sphere', 'somethingNew']).join(','));
  check('CONTROL: names that ARE classified are not reported',
    unclassified(['cuboid', 'sphere', 'hull']).length === 0,
    unclassified(['cuboid', 'sphere', 'hull']).join(','));
  check('an unjudged name does NOT quietly count as blocking',
    blockedNames(['somethingNew']).length === 0,
    'blockedNames must answer only about names it knows -- unclassified() is the check for the rest');

  console.log('\n=== blockedNames answers per name, and says so ===');

  check('scale is reported blocked even though scale([2,2,2]) would build',
    blockedNames(['scale']).length === 1,
    'conservative on purpose -- see the note on blockedNames');
  check('CONTROL: nothing is reported for a call list with no blocked name',
    blockedNames(['cuboid', 'translate', 'hull'.slice(0, 3) + 'X']).length === 0);
  check('order follows SURFACE, not the caller’s list',
    blockedNames(['hull', 'scale']).map((e) => e.name).join(',') === 'scale,hull',
    blockedNames(['hull', 'scale']).map((e) => e.name).join(','));
};
