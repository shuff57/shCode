## Waves with a pause

**Read before `5.10.7 Lab: Waves`.** About 8 minutes.

So far Defender's enemies arrive on a beat, one every 60 frames, whether or not the last ones are gone. A wave game works differently: a group arrives together, and the next group comes only when the field is clear, after a short breather. 5.8.17 built that check (`enemies.length === 0` before a new group). This example adds the breather.

Watch the three numbers at the top.

```js live
// Waves: a new wave only when the field is clear, after a pause.
let enemies, wave, wavePause;

function setup() {
  new Canvas(400, 300);
  enemies = [];
  wave = 0;
  wavePause = 60;
}

function spawnWave() {
  wave += 1;
  for (let i = 0; i < wave + 2; i++) {
    const e = new Sprite(40 + floor(random(8)) * 45, -20 - i * 50, 30, 30);
    e.collider = 'none';
    e.color = 'crimson';
    enemies.push(e);
  }
}

function nextWave() {
  if (enemies.length > 0) return;   // the field is not clear yet
  wavePause -= 1;                   // the same countdown as the cooldown in 5.9
  if (wavePause <= 0) {
    spawnWave();
    wavePause = 90;
  }
}

function draw() {
  background('#111');
  nextWave();

  for (let j = enemies.length - 1; j >= 0; j--) {
    enemies[j].y += 2;
    if (enemies[j].y > 300) {
      enemies[j].delete();
      enemies.splice(j, 1);
    }
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('wave: ' + wave, 12, 24);
  text('on the field: ' + enemies.length, 12, 46);
  text('pause: ' + wavePause, 12, 68);
}
```

**What you'll see:** `pause` counts down from 60, then wave 1 arrives: three enemies in a column, one above the other. While any of them is still on the field, `pause` stays where it is and nothing new arrives. When the last one has fallen out, `pause` counts down from 90, and wave 2 brings four.

**How it works.**

- `nextWave()` runs every frame. Its first line returns straight away while `enemies.length` is more than 0, so the countdown below it only runs on a clear field.
- `wavePause` is Part A's cooldown wearing a different name: take 1 off every frame, and act when it reaches 0. Acting means building the wave and starting the countdown again, at 90.
- `spawnWave()` adds 1 to `wave` first, so the loop makes `wave + 2` enemies: 3, then 4, then 5. `-20 - i * 50` puts each one 50 pixels above the one before it, which is what makes the column.
- `40 + floor(random(8)) * 45` picks one of eight columns across the canvas, so enemies never sit half off the edge.

**Try this:**

1. Delete the line `if (enemies.length > 0) return;`. Now a new wave comes every 90 frames whether or not the field is clear, and `on the field` keeps climbing: 5.8.17's conveyor belt again.
2. Put the line back and change `wave + 2` to `wave * 2`. The waves grow twice as fast: 2, 4, 6.
3. Change `wavePause = 90;` to `wavePause = 10;`. The next wave comes almost the moment the field is clear.
