## Sound in a sketch

**Read before `6.15.3 Lab: A sound on an event`.** About 10 minutes.

By the end of this reading you should be able to answer:

- What is a sound in a sketch, and why is it loaded in `setup()`?
- What is the difference between `play()` and `loop()`?
- What do `.volume`, `.rate` and `masterVolume()` change?
- Why can a sketch stay silent until the player clicks or presses a key?
- Where in the code does a `.play()` go?

**A sound is a file the sketch downloads.** You met this in 7.11.3: `loadSound(name)` starts downloading one of the course's sounds and hands you back a **Sound** at once. Keep it in a variable, the way you keep a sprite. The two everyday sounds are these, and the name is typed exactly, quotes included:

| Name | What it is |
| --- | --- |
| `'coin'` | a short two-note chime, about a fifth of a second |
| `'music'` | a soft tune about five seconds long, made to loop |

A misspelled name never plays, and the console says so and lists the names that exist, so when a sketch stays silent, look in the console first. The full path, `'/moshion/assets/coin.wav'`, reaches the same file and still works.

**More sounds, and sounds you make yourself.** There is a small 8-bit palette you can use straight away: `'jump'`, `'hit'`, `'laser'`, `'powerup'`, `'explode'`, `'blip'`, `'select'`, `'tone'`, and `'title'`, `'win'`, `'lose'` for menus, plus more for board and battle games in Library, Built in. They load exactly like the two above: `loadSound('jump')`.

The **sound mixer** at [shCode /sound](/sound) (also the **Sounds** tab beside your code in every moSHion lesson) builds a sound from a chip preset and lets you mix several channels, set each one's volume, rate and pan, and save the result. It also has a **Mic** panel: make a short sound with your mouth, and the mixer fits the Tweak knobs to it so you have a starting point to adjust. A saved sound is loaded by **name** too, the same way as a built-in one:

```js
let zap = loadSound('zap');
zap.volume = 0.8;
zap.play();
```

The mixer keeps that sound in this browser, next to your saved textures, and a sketch on this site finds it. If you save a sound under a built-in name, such as `coin`, yours plays instead of the built-in one.

**Load once, in `setup()`. Play later.** The file takes a moment to arrive, and a `.play()` that comes before it has arrived does nothing at all: no sound, only a note in the console. So every sound is loaded once, in `setup()`, and played later, when something happens. A `loadSound` in `draw()` would start a new download 60 times a second, and none of them would ever be ready.

```js
let chime;

function setup() {
  new Canvas(400, 400);
  chime = loadSound('coin');
}
```

**`play()` is one copy; `loop()` keeps going.** `chime.play();` plays the sound once, from the start. Every call starts a fresh copy, so two quick calls give two chimes that overlap. `music.loop();` plays the sound and starts it again each time it ends, until `music.stop();`. A sound has only one looping copy: `loop()` while it is already looping does nothing, so calling it again is safe.

`loop()` is also the one call that waits for the file. Asked for before the file has arrived, it is remembered, and the sound starts when the file lands. That is why `music.loop()` can sit in `setup()`. `.playing` is `true` while any copy of the sound is going, and `.loaded` is `true` once the file has arrived and can play (`false` until then); the sound board in 6.15.2 shows both on the screen.

**Three settings.** A Sound has properties you set the way you set a sprite's `color`:

- `.volume` runs from `0` (silent) to `1` (full). moSHion keeps it inside that range for you.
- `.rate` is the playback speed, and the pitch moves with it. At `0.5` the sound plays at half speed, so it comes out lower and lasts twice as long; at `1.5` it is higher and shorter. One file, many sounds.
- `masterVolume(v)` sets one level for every sound at once, on top of each sound's own `.volume`. `masterVolume(0)` silences everything, `masterVolume(1)` brings it all back, and `masterVolume()` with nothing in the brackets tells you the level it is at.

**The browser's rule.** A web page may not make a sound until the person using it has clicked on it or pressed a key: the page has to know someone is there. It is the same family of rule as the one in 5.1.13, where you click the canvas before the sketch can hear your keys. moSHion switches sound on at the first key press or click on the game, so you never write anything for it. What it means for you:

- A tune started in `setup()` can be silent until the first key or click, and then it starts.
- Whether your click on **Run** already counts depends on the browser. If a sketch is silent, click the game first, then check the path, then check that the tab and your speakers are not muted.

**Where a `.play()` goes.** Put it in the one place where its event happens **exactly once**: inside the `if` that finds the event, on the frame it happens. Three places that look right and are not:

- Straight in `draw()`. It runs 60 times a second, so the sound would start 60 times a second.
- Under `kb.pressing(...)`. That is true on every frame the key is held (5.1.13). A sound for a key goes under `kb.presses(...)`, which is true only on the frame the key goes down (6.8.3).
- Under an `overlaps()` that stays true. `overlaps()` is true on every frame two sprites touch (7.5.1). The sound plays once only if the same `if` also moves one of them away, the way a game moves a coin that has been collected.

**What comes next.** The worked example (6.15.2) is a sound board to try all of this on. The labs then add sound to a small game, Star catch, one idea at a time.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **`loadSound('name')`** | Starts downloading the sound with that name (one you saved in the sound mixer, or a built-in one) and gives back a Sound. Called once, in `setup()`. |
| **`.play()`** | Plays one copy from the start. Each call is a new copy, so quick calls overlap. |
| **`.loop()`** | Plays the sound over and over until `.stop()`. One looping copy at most, so calling it again does nothing. |
| **`.stop()`** | Stops every copy of that sound. |
| **`.playing`** | `true` while any copy of the sound is going. |
| **`.loaded`** | `true` once the file has arrived and can play; `false` until then. |
| **`.volume`** | This sound's own level, from 0 to 1. |
| **`.rate`** | Playback speed. The pitch moves with it: below 1 is lower and longer, above 1 is higher and shorter. |
| **`masterVolume(v)`** | One level for every sound at once. `masterVolume()` reads it. |
