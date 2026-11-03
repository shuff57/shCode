## Music that follows the game

**Read before `6.11.7 Lab: Music for every screen`.** About 10 minutes.

By the end of this reading you should be able to answer:

- Where in a game does the music change?
- Why does the old music have to stop first?
- How can one tune give four different moods?
- When is a sound setting saved, and when is it loaded?
- Why is `getItem('soundLevel') || 5` the wrong way to load a volume?

**One variable owns the screen.** A game with a title screen, the game itself and two end screens keeps the one it is on in one variable, `state` (6.6.7): `'title'`, `'play'`, `'won'` or `'lost'`. Each screen has its own music: a calm tune on the title, a livelier one while you play, a short bright one for a win and a slow one for a loss.

**Change the music when the screen changes, once.** The music for a screen does not belong in `draw()`, which runs 60 times a second. It belongs to the moment the screen changes, and that moment needs one home. 6.6.24 saved the game in the place where the state changes; here every change of screen goes through one function, `goTo(next)`, and that function changes the music too:

```js
function goTo(next) {
  music.stop();          // whatever was playing stops first
  state = next;
  if (next === 'title') {
    music.rate = 0.8;    // slower and lower: a calm title
    music.loop();
  }
  // ...and one if for each of the other screens
}
```

Every place that used to say `state = 'play'` says `goTo('play')` instead, so no screen can be reached without its music changing with it.

**Why stop first.** Two things go wrong if the old music is not stopped. `loop()` while the sound is already looping does nothing, so the title's loop would carry on into the game. And `play()` starts a new copy every time, so a win's tune would play on top of the game's. `stop()` stops every copy of that sound, so each new screen starts from silence.

**One tune, four moods.** The course has one tune, and `.rate` changes its speed and its pitch together (6.11.1). Set the rate, then start it:

| Screen | Rate | Started with |
| --- | --- | --- |
| `'title'` | 0.8: slower and lower | `loop()` |
| `'play'` | 1: as it was made | `loop()` |
| `'won'` | 1.25: faster and higher | `play()`, once, then quiet |
| `'lost'` | 0.6: slow and low | `play()`, once, then quiet |

A real game would load a different file for each screen. The shape of `goTo` stays the same: stop, change `state`, start the new screen's sound.

**Settings that remember.** Many games have a screen of sound options: how loud, and on or off. Two variables hold them, a whole number `level` from 0 to 10 and `muted`, `true` or `false`, and one line turns them into sound for everything at once:

```js
masterVolume(muted ? 0 : level / 10);
```

That is the `? :` from chapter 2: when `muted` is true the level is 0, and otherwise it is `level` tenths of full. A player who turns the sound down expects it to stay down next time, and that is 6.5's save and load:

- **Save when a setting changes** (6.5.3): right after the level or the mute changes, `storeItem('soundLevel', level);` and `storeItem('soundMuted', muted);`.
- **Load once, at the start**: `getItem('soundLevel')` gives back exactly what was saved, a number for a number and `true` or `false` for `muted`, or `null` when nothing was ever saved (6.5.5, 6.5.6).

**The `|| 5` trap.** 6.5.6 loaded a high score with `getItem('highScore') || 0`. For a volume that would be a bug. `||` picks its right side whenever the left side counts as false, and `0` counts as false just like `null`. A player who saved a level of 0 would come back to 5. Ask about `null` itself instead:

```js
const savedLevel = getItem('soundLevel');
if (savedLevel !== null) level = savedLevel;
```

`!==` is "is not". The saved level is used whenever there is one, 0 included, and `level` keeps its starting value only on a first run.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **`goTo(next)`** | The one function every change of screen goes through. It stops the old music, sets `state` and starts the new screen's sound. |
| **`.stop()` before a new screen** | Without it, `loop()` carries on (it does nothing while looping) and `play()` adds a second copy on top. |
| **`.rate` per screen** | One tune, many moods: set the rate, then `loop()` or `play()`. |
| **save when it changes** | `storeItem` right after a setting changes, not every frame. |
| **`!== null`** | "Is not null": true whenever something was saved, a saved 0 or `false` included. |
