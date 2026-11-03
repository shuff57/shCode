## A sound board

**Read before `6.11.3 Lab: A sound on an event`.** About 10 minutes.

Everything from the last reading in one sketch: one chime at four speeds, and a tune you can start and stop. Press Run, then click the canvas: that click gives the sketch your keys, and it is also what lets the browser make sound.

```js live
// A sound board. Click the canvas first, then use the keys.
let chime, tune;
let lastKey = 'none yet';

function setup() {
  new Canvas(400, 300);
  chime = loadSound('/moshion/assets/coin.wav');
  tune = loadSound('/moshion/assets/music.wav');
  tune.volume = 0.4;   // the tune sits under the chime
}

function draw() {
  background('#123');

  // 1 to 4: the same chime at four speeds. A higher rate is a higher note.
  if (kb.presses('1')) { chime.rate = 0.5;  chime.play(); lastKey = '1'; }
  if (kb.presses('2')) { chime.rate = 0.75; chime.play(); lastKey = '2'; }
  if (kb.presses('3')) { chime.rate = 1;    chime.play(); lastKey = '3'; }
  if (kb.presses('4')) { chime.rate = 1.5;  chime.play(); lastKey = '4'; }

  // T starts the tune looping. X stops it.
  if (kb.presses('t')) tune.loop();
  if (kb.presses('x')) tune.stop();
}

function drawTop() {
  fill('white');
  textSize(16);
  text('1 2 3 4: the chime, low to high', 12, 30);
  text('T: loop the tune    X: stop it', 12, 56);
  text('last chime key: ' + lastKey, 12, 110);
  text('chime loaded: ' + chime.loaded, 12, 136);
  text('tune playing: ' + tune.playing, 12, 162);
}
```

**What you'll see:** five lines of words: two that name the keys, then three that report on the sounds. `chime loaded` (the `.loaded` from 6.11.1) turns `true` a moment after Run, once the file has arrived. Press 1, 2, 3 and 4: the same chime four times, from low and slow to high and quick. Press T: `tune playing: true`, and the tune loops under everything until you press X.

**Try this:**

1. Press 1 and then 4, and listen to how long each one lasts. `rate` is the speed and the pitch together, so at 0.5 the chime is lower and twice as long as at 1.
2. Change `kb.presses('3')` to `kb.pressing('3')`, press Run, click the canvas, and hold 3 for a second. You hear a buzz, not a chime: `pressing` is true on every frame the key is held, and each frame starts a new copy, about 60 a second, piled on top of each other. Put `presses` back.
3. Press T three times, then listen. There is still only one tune: `loop()` while the tune is already looping does nothing. Press X and it stops. Now press 1 quickly five times: five chimes that overlap, because every `play()` is a new copy.
4. Delete the whole T line, `if (kb.presses('t')) tune.loop();`, and write `tune.loop();` on a line of its own in `setup()`, under the volume line. Press Run. Do not touch anything yet. `tune playing` turns `true` as soon as the file arrives, because `loop()` remembered it was asked. If your browser is holding sound back until you click or press a key, you hear nothing yet; click the canvas and the tune starts. Then take `tune.loop();` out of `setup()` and put the T line back.
5. Open the **Sounds** tab (or [the sound mixer](/sound) in its own page). Pick a chip preset, set its volume, rate and pan, name it `zap`, and press Save. Back in the sketch, change the chime line to `chime = loadSound('zap');`. Run it and press 1: your sound, at the speed the key asks for. The mixer and the sketch share this browser's saved sounds, so nothing is downloaded or uploaded.

**What each Try found.** Try 1: `rate` gives you many sounds from one file. Try 2: a sound for a key goes under `kb.presses`, never `kb.pressing`. Try 3: `play()` adds a copy each time; `loop()` keeps one. Try 4: `loop()` waits for the file, and the browser waits for the player. Try 5: the mixer saves a sound by name, and `loadSound('zap')` finds it without a path.

The labs start next: 6.11.3 adds a chime and a thud to a small game, each played where its event happens once.
