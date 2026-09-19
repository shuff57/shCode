// 6.5.27 Challenges: Extended Save Features (reference solution).
//
// The challenge this one takes: save a WHOLE PROFILE, not a single number.
// storeItem already serialises for you, so the explicit JSON.stringify /
// JSON.parse pair here is the point of the exercise rather than a
// requirement of the API -- it is what lets you see the saved shape, version
// it, and refuse a save written by an older build.

const saveKey = 'arcadeProfile';
const saveVersion = 2;

let profile;
let score = 0;

function setup() {
  new Canvas(500, 400);
  profile = loadProfile();
}

// Reads the save, and survives all three ways it can go wrong: nothing
// stored yet, stored text that is not valid JSON, and a save written by an
// older version of the game.
function loadProfile() {
  let raw = getItem(saveKey);
  if (raw === null) return freshProfile();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // Corrupt or hand-edited. Better a new profile than a crash on boot.
    return freshProfile();
  }

  if (!parsed || parsed.version !== saveVersion) return freshProfile();
  return parsed;
}

function freshProfile() {
  return { version: saveVersion, best: 0, runs: 0, history: [] };
}

function saveProfile() {
  storeItem(saveKey, JSON.stringify(profile));
}

function endRun() {
  profile.runs = profile.runs + 1;
  profile.history.push(score);
  if (score > profile.best) profile.best = score;
  saveProfile();
  score = 0;
}

function draw() {
  background('#222');

  if (kb.presses('space')) score = score + 10;
  if (kb.presses('enter')) endRun();

  fill('white');
  textSize(16);
  text('space scores, enter banks the run', 20, 30);
  text('this run: ' + score, 20, 60);
  text('best: ' + profile.best + '   runs: ' + profile.runs, 20, 85);
  text('last few: ' + profile.history.slice(-5).join(', '), 20, 110);
}
