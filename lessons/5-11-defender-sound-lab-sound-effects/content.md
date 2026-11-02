## Sound effects

About 15 minutes. The game in `script.js` is your 5.11.6 game, and it plays exactly as before. This lab adds one new thing, sound, and puts it inside methods you have already written: a zap every time a shot is fired, and a boom every time a shot finishes an enemy. The Steps tab teaches the same things one step at a time; this file has them all in one place.

### A sound is an object you load

`loadSound(path)` downloads a sound file and gives you back a **Sound** object. Keep it in a variable, the same way you keep a sprite:

```js
let zap;

function setup() {
  new Canvas(400, 400);
  zap = loadSound('/moshion/assets/coin.wav');
}
```

The course has two sound files, and the path has to be typed exactly, quotes and all:

| Path | What it sounds like |
| --- | --- |
| `'/moshion/assets/coin.wav'` | a short blip, about a fifth of a second |
| `'/moshion/assets/music.wav'` | a five-second tune |

A misspelled path does not show an error. The sound just never plays, so if your game stays silent, check the path first.

**Load once, in `setup()`. Play later.** A sound file has to download before it can play, and that takes a moment. A `.play()` that comes before the download has finished does nothing at all: no sound and no error. So every sound is loaded once, in `setup()`, and played later, when something happens in the game. Loading inside `draw()` or inside a constructor would start a new download every time, and each `.play()` would come too early to be heard.

### Playing it

`zap.play();` plays the sound once, from the start. Every call starts a fresh copy, so two shots fired close together give two zaps that overlap, rather than the second one cutting off the first.

### Two settings: volume and rate

A Sound has properties you can set, the way a sprite has `color`:

- `.volume` runs from `0` (silent) to `1` (full).
- `.rate` is the playback speed, and it changes the pitch as well. At `0.5` the sound plays at half speed, so the same blip comes out slower and lower.

That is how one file gives you two different sounds. Load it twice, into two variables, and set each one differently:

```js
zap = loadSound('/moshion/assets/coin.wav');
zap.volume = 0.3;    // shots come often, so keep them quiet
boom = loadSound('/moshion/assets/coin.wav');
boom.rate = 0.5;     // the same blip, slower and lower
```

### The browser's rule

A browser will not make any sound until the player has pressed a key or clicked on the page. moSHion switches sound on at the first key press, so you never have to write anything for it. In Defender the first sound is a shot, and a shot needs Space, so the rule never gets in your way. Just click the game first so it gets your keys.

### Where each sound goes

A sound belongs in the one place where its event happens **exactly once**.

- **A shot is fired.** `fire()` makes every shot with `new Bullet(...)`, so `Bullet`'s constructor runs once for every shot and at no other time. Its last line is the place for `zap.play();`.
- **A shot finishes an enemy.** Every hit calls `takeHit(1)`. After the line that shows the new hp, `if (!this.isAlive()) boom.play();` asks the enemy the same question the scene asks, and plays only on the hit that finished it. A 3-hp enemy takes three hits and booms once.

Two places that look right and are not: `isAlive()` is asked many times every frame (by `hits()` and by `clearFinished()`), and `draw()` runs 60 times a second, so a `.play()` in either would play over and over.

### Optional: a mute key

`masterVolume(0)` turns every sound off at once, `masterVolume(1)` turns them all back on, and `masterVolume()` with nothing in the brackets tells you the level it is at now. So one key can flip it:

```js
if (kb.presses('m')) {
  if (masterVolume() > 0) masterVolume(0);
  else masterVolume(1);
}
```

Put it in `draw()` next to the R line, outside `if (playing)`, so M still works on the game-over screen.

The moSHion docs (`/docs/moshion`, the **Sound** section) say all of this too, with a few more settings to try once the lab is done.
