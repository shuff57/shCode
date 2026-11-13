## Sound effects

About 15 minutes. The game in `script.js` is your 7.10.2 game, and it plays exactly as before. This lab adds one new thing, sound, and puts it inside methods you have already written: a zap every time a shot is fired, and a boom every time a shot finishes an enemy. The "Your task" steps teach the same things one step at a time; this file has them all in one place.

### A sound is an object you load

`loadSound(name)` downloads one of the course's sounds and gives you back a **Sound** object. Keep it in a variable, the same way you keep a sprite:

```js
let zap;

function setup() {
  new Canvas(400, 400);
  zap = loadSound('coin');
}
```

Every built-in sound has a name, and the name has to be typed exactly, quotes and all. This lab uses two:

| Name | What it sounds like |
| --- | --- |
| `'coin'` | a short blip, about a fifth of a second |
| `'music'` | a five-second tune |

Library, Built in, lists the rest (`'jump'`, `'laser'`, `'explode'` and more), each with a play button. A misspelled name never plays, and the console says so, so if your game stays silent, look in the console first. The full path, `'/moshion/assets/coin.wav'`, reaches the same file and still works.

**Load once, in `setup()`. Play later.** A sound file has to download before it can play, and that takes a moment. A `.play()` that comes before the download has finished does nothing at all: no sound, only a note in the console. So every sound is loaded once, in `setup()`, and played later, when something happens in the game. Loading inside `draw()` or inside a constructor would start a new download every time, and each `.play()` would come too early to be heard.

### Playing it

`zap.play();` plays the sound once, from the start. Every call starts a fresh copy, so two shots fired close together give two zaps that overlap, rather than the second one cutting off the first.

### Two settings: volume and rate

A Sound has properties you can set, the way a sprite has `color`:

- `.volume` runs from `0` (silent) to `1` (full).
- `.rate` is the playback speed, and it changes the pitch as well. At `0.5` the sound plays at half speed, so the same blip comes out slower and lower.

That is how one file gives you two different sounds. Load it twice, into two variables, and set each one differently:

```js
zap = loadSound('coin');
zap.volume = 0.3;    // shots come often, so keep them quiet
boom = loadSound('coin');
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

The [moSHion docs’ Sound section](/docs/moshion/groups?page=6) explains all of this too, with a few more settings to try once the lab is done.
