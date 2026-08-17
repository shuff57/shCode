// Runs the 7.1.1 Arcade Cabinet requirement regexes against sample submissions.
//
// The capstone is a performance task: the checklist is the whole spec and the
// student invents everything else, so these checks have to recognise a
// capability written in a style nobody taught. That cuts both ways, and both
// ways are graded work —
//
//   * too tight and it fails correct games (an arrow function instead of a
//     declaration, forEach instead of for, switch instead of if-chains),
//   * too loose and it passes a game that never did the thing (any `[` and a
//     comma read as "an array", a stray `return` inside an `if` read as "a
//     function that returns a value").
//
// So the happy path passing proves nothing on its own. Each case below removes
// exactly ONE capability and asserts exactly ONE requirement notices.
//
// The starter case is the sharpest of them: the checklist lives in that file's
// comments, so a pattern loose enough to read prose ticks itself off before the
// student writes a line. `class you wrote yourself` and `PASS / FAIL tests`
// both did exactly that until req1 and req11 were tightened.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const lesson = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '..', 'lessons', '7-1-1-arcade-cabinet');
const L = JSON.parse(fs.readFileSync(path.join(lesson, 'lesson.json'), 'utf8'));
const STARTER = fs.readFileSync(path.join(lesson, 'script.js'), 'utf8');

// A plausible submission: a lane-dodger. Deliberately NOT written to flatter the
// regexes — different names, different style from anything in the lessons.
const FULL = `
// Meteor Lanes — dodge rocks, bank fuel, beat your best run.
let state = 'title';
let ship, rocks, best = 0, fuel = 0;
const LANES = [120, 240, 360, 480];

class Rock extends Sprite {
  constructor(lane) {
    super(LANES[lane], -20, 30);
    this.vel.y = 4;
    this.bounciness = 0.2;
  }
}

function fuelFor(depth) {
  if (depth > 10) return 3;
  return 1;
}

function setup() {
  new Canvas(600, 800);
  world.gravity.y = 0;
  ship = new Sprite(300, 700, 40);
  rocks = new Group();
  best = Number(getItem('best')) || 0;
  for (let i = 0; i < LANES.length; i++) {
    new Rock(i);
  }
  console.log(fuelFor(11) === 3 ? 'PASS fuelFor deep' : 'FAIL fuelFor deep');
  console.log(fuelFor(2) === 1 ? 'PASS fuelFor shallow' : 'FAIL fuelFor shallow');
  console.log(LANES.length === 4 ? 'PASS four lanes' : 'FAIL four lanes');
}

function update() {
  if (state === 'title' && kb.presses('Enter')) state = 'play';
  if (state === 'play') {
    if (kb.pressing('left')) ship.vel.x = -6;
    if (ship.overlaps(rocks)) {
      state = 'gameover';
      if (fuel > best) storeItem('best', fuel);
    }
  }
}

function draw() {
  clear();
}
`;

const cases = [
  ['starter (nothing built yet)', STARTER, 'none'],
  ['full submission', FULL, 'all'],
  ['no class', FULL.replace(/class Rock[\s\S]*?\n}\n/, ''), 'req1'],
  ['no group', FULL.replace('rocks = new Group();', 'rocks = [];'), 'req2'],
  ['no overlap', FULL.replace('ship.overlaps(rocks)', 'fuel > 99'), 'req3'],
  ['no input', FULL.replace(/kb\.\w+\('[^']+'\)/g, 'false'), 'req4'],
  ['no tuning', FULL.replace('world.gravity.y = 0;', '')
                   .replace('this.vel.y = 4;', '')
                   .replace('this.bounciness = 0.2;', '')
                   .replace('ship.vel.x = -6;', 'ship.x -= 6;'), 'req5'],
  ['no states', FULL.replace(/state = '\w+'/g, 'fuel = 1').replace(/state === '\w+'/g, 'true'), 'req6'],
  ['saves but never loads', FULL.replace("best = Number(getItem('best')) || 0;", 'best = 0;'), 'req7'],
  ['no param+return fn', FULL.replace(/function fuelFor[\s\S]*?\n}\n/, ''), 'req8'],
  ['no array', FULL.replace('const LANES = [120, 240, 360, 480];', 'const LANES = 4;')
                   .replace(/LANES\[lane\]/, '100 * lane').replace(/LANES\.length/g, 'LANES'), 'req9'],
  ['no loop', FULL.replace(/for \(let i[\s\S]*?\n  }\n/, ''), 'req10'],
  ['no PASS/FAIL', FULL.replace(/console\.log\([^\n]*\);\n/g, ''), 'req11'],
];

// Styles a student could legitimately use instead. These must still pass their
// requirement — a check that only accepts the way the lessons happened to write
// it is a check that fails correct work.
const arrowFn = FULL.replace(/function fuelFor[\s\S]*?\n}\n/, 'const fuelFor = (depth) => depth > 10 ? 3 : 1;\n');
const methodFn = FULL.replace(/function fuelFor[\s\S]*?\n}\n/, '')
  .replace('this.bounciness = 0.2;', 'this.bounciness = 0.2;\n  }\n  yieldFor(depth) {\n    return depth > 10 ? 3 : 1;')
  .replace(/fuelFor\((\d+)\)/g, 'new Rock(0).yieldFor($1)');
const switchState = FULL.replace(/if \(state === 'title'[\s\S]*?\n  }\n/,
  "switch (state) {\n    case 'title': if (kb.presses('Enter')) state = 'play'; break;\n    case 'play': if (ship.overlaps(rocks)) { state = 'gameover'; storeItem('best', fuel); } break;\n  }\n");
const forOf = FULL.replace(/for \(let i = 0; i < LANES\.length; i\+\+\) \{\n    new Rock\(i\);\n  \}/,
  'LANES.forEach((x, i) => new Rock(i));');
// False positive probes: things that must NOT satisfy a requirement.
const indexNoArray = FULL.replace('const LANES = [120, 240, 360, 480];', 'const LANES = 4;')
  .replace('LANES[lane]', '100 * lane').replace(/LANES\.length/g, 'LANES')
  .replace('rocks = new Group();', 'rocks = new Group();\n  const r = allSprites[0], q = 1;');
const noOwnFn = FULL.replace(/function fuelFor[\s\S]*?\n}\n/, '')
  .replace(/console\.log\(fuelFor[^\n]*\n/g, '')
  .replace('if (state === \'play\') {', 'if (state === \'play\') {\n    if (fuel > 3) { return; }');

const styleCases = [
  ['style: arrow fn', arrowFn, 'all'],
  ['style: class method', methodFn, 'all'],
  ['style: switch on state', switchState, 'all'],
  ['style: forEach not for', forOf, 'all'],
  ['probe: indexing is not an array', indexNoArray, 'req9'],
  ['probe: bare return in an if', noOwnFn, 'req8'],
];
cases.push(...styleCases);

console.log('7.1.1 capstone: the checklist recognises the capability, not the wording\n');
let bad = 0;
for (const [name, src, expectFail] of cases) {
  const failed = L.requirements
    .filter((r) => !new RegExp(r.pattern, r.flags).test(src))
    .map((r) => r.id);
  let ok;
  if (expectFail === 'all') ok = failed.length === 0;
  else if (expectFail === 'none') ok = failed.length === L.requirements.length;
  else ok = failed.length === 1 && failed[0] === expectFail;
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${name.padEnd(28)} want ${String(expectFail).padEnd(4)}  got [${failed.join(',')}]`);
}
console.log(bad ? `\n${bad} case(s) wrong`
  : `\nALL PASS  (${cases.length} cases against ${L.requirements.length} requirements)`);
process.exit(bad ? 1 : 0);
