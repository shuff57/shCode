# Sound and Music spec (module 6.11)

Written 2026-11-01 on branch `codehs-inspiration`, before the lessons it describes, then completed as they were built
(`lessons/6-11-sound-*`). Built the way 6.9 and 6.10 were (`GRIDS-SPEC.md`, `BREAKOUT-SPEC.md`), with their review rounds'
grader lessons applied up front (`loop/grids-fix-cases.md`, `loop/breakout-fix-cases.md`): strings blanked
(`ignoreStrings: true`) and comments stripped on every code card except the one that reads a path and the one that reads a
sentence; parentheses, spacing and brace placement tolerated; any variable, counter or helper name accepted where the card
does not need a fixed one; empty `if` bodies refused where a pattern can tie the fragments together; graded laxly overall
(`feedback_pseudocode-grading-lax`). Ideas only from CodeHS Game Design 4.6 and the book's chapter 6.10 (PLACEMENT.md row
"new: sound and music"); no CodeHS text, problems or code.

**Placement.** PLACEMENT.md lists "new: sound and music" in the concepts/systems block with no lesson anywhere. The next
free number in Chapter 6 after 6.10 Breakout is **6.11**; neither PLACEMENT.md nor PACING.md says otherwise. Folders are
`6-11-sound-<n>-<slug>` (the D1 ids, final once shipped); titles start `6.11.N`.

**Week 18.** The module needs 6.5 (storeItem, week 16) and 6.6 (state machines, week 17), so it cannot go earlier than
week 17. Measured from every `lesson.json` on 2026-11-01: week 17 holds 760 min (6.6-6.8), week 18 holds 527 (6.10 and
7.1). This module is 150 min: week 17 would become 910 (2.1 x the 440-min Q2 average of PACING.md), week 18 becomes 677
(1.5 x). Week 18 is the lighter of the two and keeps 6.11 after 6.10 in the week order as well as the numbering.
`week: 18` in every `lesson.json`, `weeks: [18]` in the module doc.

**A concept module, not a build.** The labs are one small game (Star catch) that gains sound, one idea per lab. There is
no written plan and no playtest screen (the brief: a concept module does not need them), so nothing here is AI-graded.

**Size.** 10 lessons, 150 minutes by `estimateMins`: 2 readings, 1 worked example, 5 labs, 1 check, 1 challenges.

---

## 0. A blocking fact found while building: the course's two sound files are silent

`public/moshion/assets/coin.wav` (8,379 frames, 0.19 s) and `music.wav` (235,201 frames, 5.33 s) are valid 16-bit mono
44.1 kHz WAV files whose every sample is **0**. Measured with Python's `wave` module (max 0, min 0, 0 non-zero samples)
and `od` (every data byte `00`). They are byte-identical to the moSHion repo's `assets/` (same SHA-256), and the only
commit that ever touched them there (`ceb440d`, "Adds assets/coin.wav (two-tone chime, 0.19s) and assets/music.wav
(soft Am-C-F-G loop, 5.3s), synthesized here") already held the zero bytes. So the files load, decode and "play" with no
error, and nothing is heard: not in this module, not in 5.11.9, and not in the docs' Sound example.

This module is written against those two paths and describes them as the commit message does (a short two-note chime,
a soft five-second tune). Every lesson is correct the moment the two files hold real audio; until then every lab runs
and grades correctly but is silent. No new audio was added here (the brief: no new audio, and no existing script makes
these files). Section 11 says what is needed.

---

## 1. What the student builds, and why this shape

One small game, **Star catch**, on a 400 x 400 canvas: an orange basket (`'static'`, 70 x 16 at y 370) slid by the arrow
keys and kept on screen; a gold star (18 across, `collider = 'none'`) that falls 3 pixels a frame from a random x; a catch
when the star `overlaps()` the basket, a miss when it falls past y 410. Each lab adds one sound idea to it:

| Lab | Sound idea |
| --- | --- |
| 6.11.3 | a sound on an event: a chime for each catch, a low thud for each miss |
| 6.11.4 | a looping tune under the game, its volume on the up and down keys, and M to mute everything |
| 6.11.5 | sounds that vary: a random pitch for each catch, one of three thuds picked at random for each miss |
| 6.11.7 | music that follows the screen: title, play, won, lost, changed once in `goTo(next)` |
| 6.11.8 | a sound options screen whose level and mute are saved with `storeItem` and loaded with `getItem` |

| Choice | Reason |
| --- | --- |
| A new small game, not Breakout | A concept module's labs should be short enough to read in a minute. Breakout's finished file is over 200 lines and would make every card scope through code that has nothing to do with sound. Star catch is the 6.10.4 paddle and the 5.9.5 `overlaps()` the student already knows, in 60 lines. |
| A catch and a miss are the events | Both happen once and the star is moved away at once (`dropStar()`), so the `if` that finds each one runs exactly once per event. That makes "a `.play()` goes where its event happens once" one sentence, the rule 5.11.9 taught. |
| Only `coin.wav` and `music.wav` | The two files the course has (section 0). Variety comes from `.rate` (speed and pitch together), `.volume`, and loading the same file into more than one variable, as 5.11.9 did. |
| One `music` object for every screen, its `.rate` set per screen | Each screen's mood is the same tune at its own speed (title 0.8, play 1, won 1.25 once, lost 0.6 once). It also closes an engine race (section 11, risk 2): a `loop()` asked for before the file has downloaded is remembered, and `stop()` does not forget it, so two tune objects can both start if the player leaves the title within the download time. With one object the remembered loop starts at whatever rate the current screen set. |
| `goTo(next)` for every change of screen | 6.6.27's own challenge solution and 6.6.24's "call it every time you enter a state" shape. Music is changed in the transition, once, never in `draw()`. |
| Volume as a whole-number `level`, 0 to 10, used as `level / 10` | No floating-point display (`0.30000000000000004`), no untaught `round`, and a saved `0` makes the `|| 5` trap of 6.5.6 real (6.11.8 step 3). |
| `masterVolume()` for mute and level, `music.volume` for the tune against the effects | `masterVolume` scales everything with no change to each sound's own volume (the engine's master gain), which is what a mute or a settings slider means. |
| Settings key O, not S | moSHion feeds W, A, S, D into up, left, down, right (`KEY_DIRS_`), so S on the options screen would also lower the volume. O ("options") is free. |

**Kept out on purpose:** `fade()` (fading to 0 leaves the sound's volume at 0, so its next `loop()` is silent until the
volume is set back: a trap with no lesson to teach it; it is accepted as a rule of your own in the challenges), `pan` and
`clips` in the labs (challenges 2 and 3), `pause()` (it is `stop()` in Web Audio), `.ready` promises, sound from a
`Group` callback.

---

## 2. What the student already knows, and what this module adds

### Assumed from before 6.11 (taught on the screen named)

| Idea | Taught in |
| --- | --- |
| `loadSound(path)` into a variable, once, in `setup()`; `.play()`; `.volume`; `.rate`; `masterVolume()`; the browser's no-sound-before-a-key rule | 5.11.9 Lab: Sound effects |
| `kb.pressing` (every frame held) vs `kb.presses` (the one frame it goes down) | 5.1.13 Reading: kb.pressing(key); 6.3.3 Reading: moSHion docs: Input edges |
| Click the canvas so the sketch hears your keys | 5.1.13 Reading: kb.pressing(key) |
| `overlaps()` asks about this frame, and is true on every frame two sprites touch | 5.9.5 Reading: Did the shot hit? |
| `random(min, max)`, `floor(random(list.length))` picks a position in a list | 5.2.1 Reading: Random numbers and timers |
| A paddle moved by keys and kept on screen by its half-width | 6.10.4 Lab: The paddle |
| The state variable; key-driven and condition-driven transitions; one function called on every change of state | 6.6.7 Reading: moSHion docs: The state Variable; 6.6.16 Worked Example: Keyboard-Driven State Changes; 6.6.17 Reading: moSHion docs: Condition-Driven Transitions; 6.6.24 Worked Example: Save on State Transition |
| `storeItem` once when a setting changes; `getItem` gives back the type saved, or `null` | 6.5.3 Reading: storeItem: Save Game Data; 6.5.5 Reading: getItem: Load Saved Data; 6.5.6 Reading: What getItem Gives Back |
| `|| 0` for a first run, and that `null` counts as false for `||` | 6.5.6 Reading: What getItem Gives Back |

No citation reaches into chapters 1-2, so `check-lesson-citations.mjs` needs no new `WAIVED` entry.

### New in this module (taught on the screen named, before any lab asks for it)

| New idea | Taught in | First asked in |
| --- | --- | --- |
| The two course files and what each is for; a sound is a downloaded file, silent until it has arrived | 6.11.1 | 6.11.3 |
| `loop()`: one looping copy however often it is called; `stop()`; `.playing` | 6.11.1, 6.11.2 | 6.11.4 |
| The browser rule in full: no sound before a key or a click; the first one switches sound on; in the course's editor the click on Run may already count | 6.11.1 | (every lab, step text) |
| `.rate` changes speed and pitch together | 6.11.1, 6.11.2 (Try 1) | 6.11.5 |
| A `.play()` under `kb.pressing` plays every frame held | 6.11.2 (Try 2) | 6.11.4 |
| A whole-number `level` turned into a volume with `/ 10`, kept between 0 and 10 | 6.11.4 step 2 | 6.11.4 |
| Mute everything with `masterVolume(0)`, back on with `masterVolume(1)` | 6.11.1, 6.11.4 step 3 | 6.11.4 |
| A random rate per play; one of several sounds picked from a list | 6.11.5 steps 1-2 (5.2.1's random) | 6.11.5 |
| Music changed in the transition, once; stop first, because `loop()` while looping does nothing and `play()` starts a second copy | 6.11.6 | 6.11.7 |
| Save a setting when it changes; load it in `setup()`; `!== null` (not `|| 5`) when 0 is a real value | 6.11.6, 6.11.8 step 3 | 6.11.8 |

---

## 3. Conventions every lesson follows

- **Folders** `6-11-sound-<n>-<slug>`; **titles** start with the displayed number.
- **lesson.json fields** as 6.10: `category: "Unit 2: moSHion: Applied Game Development"`, `unit: "6.11 Sound and Music"`,
  `week: 18`, `slos: ["SLO-2", "SLO-3"]` (structured programming: one transition function owns the music; design,
  implement and test). Readings `type "lesson", preview "reading"`; the worked example `preview "example"` with a
  `js live` block; labs and challenges `preview "moshion"` with `script.js` + `solution.js`, `steps`, `requirements` (all
  `points: 0`) and no `content.md`; the check `type "assignment", preview "quiz"`, `passPercent 70`, `points 0`.
- **content.md is not rendered in a moshion lab**, so each lab's `description`, step `instructions` and `hints` carry
  everything the lab asks for, including the browser rule and the challenges.
- **Requirement cards**: `id`, `title`, `description` ending in `Help: <number> (<exact title>)`, `type` (`inFunction`
  with `function`, or `regex`), `file "script.js"`, `pattern`, `flags ""`, `ignoreStrings: true`, `points 0`,
  `status "pending"`. Two exceptions: 6.11.3 r1 reads the sound's path, so it does not blank strings (5.11.9 r1 is the
  same card); 6.11.10 r2 reads the sentence, copied from 6.10.13 r2 (`flags "i"`, `stripComments: false`).
- **Strings are blanked**, so a quoted word is matched by its length: `'title'` 5 spaces, `'play'`/`'lost'` 4, `'won'` 3.
- **Starter comments carry no answers** and, in the challenges starter, no `would`/`without`/`otherwise`/`instead`/`if`/
  `remov...` words, since 6.11.10 r2 reads every comment.
- **Fixed names, shared by every lab:**

| Kind | Names |
| --- | --- |
| Sprites | `basket` (`new Sprite(200, 370, 70, 16, 'static')`, orange), `star` (`new Sprite(200, -10, 18)`, `collider = 'none'`, gold) |
| Variables | `speed` (3), `score`, `misses`, `chime`, `thud` (6.11.3-6.11.4), `thuds` (6.11.5 on), `music`, `level` (0-10), `muted`, `state` (`'title'`, `'play'`, `'won'`, `'lost'`, `'settings'`) |
| Functions | `setup()`, `draw()`, `drawTop()`, `dropStar()`, `moveBasket()`, `startGame()`, `playGame()`, `goTo(next)` (6.11.7 on), `settingsScreen()`, `soundChanged()`, `applySound()`, `loadSettings()` (6.11.8 on) |
| Paths | `'/moshion/assets/coin.wav'`, `'/moshion/assets/music.wav'` |

---

## 4. The lessons

| # | Folder | Kind | One line | Pts | Min |
| --- | --- | --- | --- | --- | --- |
| 6.11.1 | `6-11-sound-1-reading-sound-in-a-sketch` | reading | A sound is a downloaded file: load once in `setup()`, play on an event. `play()` vs `loop()`, `.volume`, `.rate`, `masterVolume()`, the browser's rule, and where a `.play()` goes. | 0 | 10 |
| 6.11.2 | `6-11-sound-2-example-a-sound-board` | example | Keys 1-4 play one chime at four rates; T loops the tune, X stops it. Four Try items. | 0 | 10 |
| 6.11.3 | `6-11-sound-3-lab-a-sound-on-an-event` | lab | Star catch is silent. Load a chime and a thud in `setup()`; play one per catch and one per miss. | 0 | 15 |
| 6.11.4 | `6-11-sound-4-lab-music-volume-and-a-mute-key` | lab | A looping tune at `level / 10`, up and down step `level` 0-10, M flips `masterVolume`. | 0 | 15 |
| 6.11.5 | `6-11-sound-5-lab-a-sound-that-varies` | lab | A random `.rate` for each catch; one of three thuds picked with `floor(random(thuds.length))` for each miss. | 0 | 15 |
| 6.11.6 | `6-11-sound-6-reading-music-that-follows-the-game` | reading | Music changes in `goTo(next)`, once; stop first; one tune, four moods by `.rate`; save settings when they change, load them at the start, `!== null` not `|| 5`. | 0 | 10 |
| 6.11.7 | `6-11-sound-7-lab-music-for-every-screen` | lab | Fill `goTo(next)`: stop, then loop the tune on the title (0.8) and in the game (1), play it once on a win (1.25) and a loss (0.6). | 0 | 20 |
| 6.11.8 | `6-11-sound-8-lab-a-settings-screen-that-remembers` | lab | A sound options screen: up/down step `level`, M flips `muted`; `storeItem` on each change; `getItem` with `!== null` at the start. | 0 | 20 |
| 6.11.9 | `6-11-sound-9-quiz-sound-and-music` | check | Eight multiple-choice questions. Checked instantly. | 0 | 10 |
| 6.11.10 | `6-11-sound-10-challenges-make-it-yours` | challenges | Add one sound rule: a streak that climbs, a chime panned to where it was caught, or chords cut from one file with `clips`. | 0 | 25 |

Titles: `6.11.1 Reading: Sound in a sketch`, `6.11.2 Worked Example: A sound board`, `6.11.3 Lab: A sound on an event`,
`6.11.4 Lab: Music, volume and a mute key`, `6.11.5 Lab: A sound that varies`, `6.11.6 Reading: Music that follows the game`,
`6.11.7 Lab: Music for every screen`, `6.11.8 Lab: A settings screen that remembers`, `6.11.9 Check: Sound and music`,
`6.11.10 Challenges: Make it yours`. Total **150 minutes**.

### Per-lesson notes

- **6.11.1 Reading** has snippets only, no live block. It cites 5.11.9 for where `loadSound` was first met, 5.1.13 for the
  click-the-canvas rule (the browser's sound rule is the same family), 6.3.3 for `presses` vs `pressing`, 5.9.5 for
  `overlaps()` being true on every frame two sprites touch. The browser rule is worded as "may": automated Chrome would not
  reproduce it (section 9), so no lesson promises the student either outcome; every lab's step says to click the game.
- **6.11.2 Worked Example**: live block (one canvas sketch), four Try items, each checked in the harness: (1) the four rates
  0.5/0.75/1/1.5; (2) `kb.pressing('3')` held 60 frames starts 60 chimes; (3) T three times is one loop, X stops it;
  (4) `tune.loop()` in `setup()` is remembered and starts when the file arrives.
- **6.11.3**: s1 load (the starter declares `let chime, thud;`), s2 chime in the catch `if`, s3 thud in the miss `if`.
- **6.11.4**: the starter is the 6.11.3 reference plus `let music;`, `let level = 4;`, an empty `soundKeys()` called from
  `draw()`, and words that show `music: N of 10   sound: on/off`. s1 load and loop, s2 up/down, s3 M.
- **6.11.5**: s1 one line before `chime.play()`; s2 is three `//--` changes (the `let`, the two thud lines, the miss
  play), each with its own STEP comment.
- **6.11.6 Reading**: snippets only. It cites 6.6.7 (state), 6.6.24 (save on a state change, the shape `goTo` follows),
  6.11.1 (rate), 6.5.3/6.5.5/6.5.6 (save when it changes; `getItem` gives back the type saved or `null`; `|| 0`).
- **6.11.7**: the starter has screens, `startGame()`, `playGame()`, and `goTo(next)` with only `state = next;`.
  `setup()` ends with `goTo('title')`, so the title music is asked for before the file arrives (and is remembered).
- **6.11.8**: the starter is the 6.11.7 reference plus a `'settings'` screen (O opens it from the title and closes it),
  `level = 5`, `muted = false`, `applySound()` (`masterVolume(muted ? 0 : level / 10)`), `soundChanged()` (apply, sample
  chime) and an empty `loadSettings()` that `setup()` calls before `applySound()`. Keys are `'soundLevel'` and
  `'soundMuted'`, so a game's own saved `level` cannot be read as a volume (the moSHion store is shared by every sketch
  in the browser; `lib/moshion-storage.ts` keeps one `moshion.store.v1`).
- **6.11.9 Check**: section 5.
- **6.11.10 Challenges**: the starter is the 6.11.8 reference with its two header lines replaced by one title line (a
  second comment line above the code would satisfy r2 on its own). Every starter comment was checked by the generator for
  the words r2's second branch reads (`would`, `without`, `otherwise`, `instead`, `if`, `remov...`); the one 6.11.8 comment
  that said "otherwise" (above `applySound()`) was reworded for that reason. The reference does all three challenges.

---

## 5. The check (6.11.9)

Eight questions, `passPercent 70`, `points 0`. Keys D, A, C, B, C, D, A, B (two of each). The correct option is not the
longest in any question (q6 is code; its longest option is the off-by-one distractor).

| id | Question | Options (answer in bold) | sourceIds |
| --- | --- | --- | --- |
| q1-browser | A sketch calls `music.loop()` in `setup()`. In a fresh tab the tune stays silent until the player clicks the game, and then it starts. Why? | A) `loop()` always waits for a click on the canvas before it starts to play<br>B) The file only begins to download at the first click<br>C) `setup()` runs a second time on the first click<br>D) **A browser lets a page make no sound before a click or a key** | 6-11-sound-1-reading-sound-in-a-sketch |
| q2-load | Why is `loadSound` called once in `setup()` and not in `draw()`? | A) **`draw()` would start a new download every frame; a sound plays only once its file has arrived**<br>B) `loadSound` stops the sketch with an error anywhere but `setup()`<br>C) A sound loaded in `draw()` plays sixty times a second, all on top of each other, until the game ends<br>D) Only `setup()` is allowed to give a variable its first value | 6-11-sound-1-reading-sound-in-a-sketch |
| q3-pressing | The code says `if (kb.pressing('3')) chime.play();` and the player holds 3 down for one second. What do they hear? | A) One chime, on the frame the key went down<br>B) One chime, on the frame the key came back up<br>C) **About sixty chimes, one each frame, piled on top of each other**<br>D) Nothing at all, because play() waits until the key has been let go again | 6-11-sound-2-example-a-sound-board |
| q4-loop | `music.loop()` runs in `draw()`, every frame. What does the player hear? | A) Sixty copies of the tune a second, piling up<br>B) **One copy of the tune, looping**<br>C) The first moment of the tune, restarted every frame<br>D) Nothing, because `loop()` works only in `setup()` | 6-11-sound-1-reading-sound-in-a-sketch, 6-11-sound-2-example-a-sound-board |
| q5-rate | The thud is set up with `thud.rate = 0.5;` before `thud.play();`. Compared with a rate of 1, how does it sound? | A) The same note, only half as loud<br>B) Higher, and over in half the time<br>C) **Lower, and twice as long**<br>D) Exactly the same: rate only changes a looping sound | 6-11-sound-1-reading-sound-in-a-sketch |
| q6-pick | `thuds` is a list of three sounds. Which line plays one of them, picked at random? | A) `thuds[random(3)].play();`<br>B) `thuds[thuds.length].play();`<br>C) `thuds[floor(random(thuds.length + 1))].play();`<br>D) **`thuds[floor(random(thuds.length))].play();`** | 6-11-sound-5-lab-a-sound-that-varies |
| q7-stop | In `goTo(next)`, why does `music.stop()` come before the new screen's tune starts? | A) **The old copy would carry on: `loop()` while looping does nothing, and `play()` adds a copy**<br>B) `stop()` rewinds the file so the next start plays it from the beginning<br>C) The browser refuses to start a second sound while another sound from the same file is going<br>D) `stop()` downloads the file again, ready for the next screen | 6-11-sound-6-reading-music-that-follows-the-game |
| q8-null | A player turned the level down to 0, and it was saved. Next time the game starts, `level = getItem('soundLevel') \|\| 5;` runs. What is `level`? | A) 0, the level that was saved<br>B) **5, because 0 counts as false for `\|\|`, just like `null`**<br>C) `null`, because a 0 is never saved<br>D) `'0'`, as text, because getItem always gives back a string of text | 6-11-sound-6-reading-music-that-follows-the-game, 6-11-sound-8-lab-a-settings-screen-that-remembers |

Explanations:

- `q1-browser`: Browsers refuse to make sound until the person has clicked or pressed a key on the page. moSHion switches sound on at the first one, and the loop that was waiting starts then.
- `q2-load`: A file takes a moment to arrive, and play() before it has arrived does nothing. draw() runs 60 times a second, so loading there starts a fresh download every frame and none is ever ready.
- `q3-pressing`: kb.pressing is true on every frame the key is held, and every play() starts a new copy. kb.presses is true only on the frame the key goes down: one press, one chime.
- `q4-loop`: A sound has one looping copy. loop() while it is already looping does nothing, so calling it every frame is safe. play() is the one that starts a new copy every call.
- `q5-rate`: rate is the playback speed, and the pitch moves with it. Half speed is lower and takes twice as long; 1.5 would be higher and shorter.
- `q6-pick`: thuds.length is 3, and floor(random(3)) is 0, 1 or 2: the three positions. random(3) alone gives a decimal such as 1.7, which is not a position; thuds.length + 1 can give 3, and thuds[3] is past the end.
- `q7-stop`: Without stop(), the title loop would just keep going into the game (loop() while looping does nothing), and a win's play() would start on top of the game's loop.
- `q8-null`: getItem gives back the number 0, but || picks its right side whenever the left counts as false, and 0 does. if (saved !== null) level = saved; keeps the 0.

---

## 6. No AI-graded screens

6.11 is a concept module (PLACEMENT.md's concepts/systems block), so it has no written plan and no playtest, the two
AI-graded screens a build module gets (PLACEMENT decision 4 applies to build modules). `generate-ai-graders` was run and
picked up nothing new from 6.11.

---

## 7. Requirement cards and patterns (verified)

`lesson.json` is the source of truth; the tables below are rendered from it. Every card is `points 0`; every code card
blanks strings and strips comments except where the table says it reads them. Nothing uses a lookbehind. Every pattern
was graded by the app's own `lib/grader.ts` on 129 cases with 0 mismatches (`loop/sound-fix-cases.md`), and timed on
5000-character adversarial input (worst 70 ms, the copied 6.10.13 r2; worst written here 58 ms).

#### 6.11.3 Lab: A sound on an event

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | Sounds are loaded once, in setup() | setup() loads a sound into a variable with loadSound and the path '/moshion/assets/coin.wav' (or music.wav), so it is ready before the game needs it. Any variable name works. Help: 6.11.1 (Reading: Sound in a sketch) | inFunction `setup` (+8 helper names, such as `loadSounds`), reads strings |
| r2 | A catch plays a sound | A sound's .play() runs inside the if that asks star.overlaps(basket), the block that runs once for each catch (or in a function that block calls). Help: 6.11.1 (Reading: Sound in a sketch) | regex, whole file |
| r3 | A miss plays a sound | A sound's .play() runs inside the if that finds the star past the bottom (star.y > 410), the block that runs once for each miss. Help: 6.11.1 (Reading: Sound in a sketch) | regex, whole file |

#### 6.11.4 Lab: Music, volume and a mute key

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | The tune loops | A sound's .loop() is called, in setup() or anywhere: loop() keeps one copy going, so calling it again is safe. Help: 6.11.1 (Reading: Sound in a sketch) | regex, whole file |
| r2 | The tune starts quieter than the effects | In setup(), a sound's .volume is set below 1: level / 10, 0.4, or any number under 1. Help: 6.11.1 (Reading: Sound in a sketch) | inFunction `setup` (+8 helper names, such as `loadSounds`) |
| r3 | Up and down change the volume | Under kb.presses (one step for each press), one key raises the level (or the volume) and another lowers it, and the level is what sets the volume. Any variable name works. Help: 6.3.3 (Reading: moSHion docs: Input edges) | regex, whole file |
| r4 | M turns every sound off and on | Under a kb.presses test, masterVolume(...) is set (or a mute variable is flipped), and somewhere masterVolume is given something other than 0, so the sound can come back. Help: 6.11.1 (Reading: Sound in a sketch) | regex, whole file |

#### 6.11.5 Lab: A sound that varies

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | Each catch has a random pitch | A sound's .rate is set from random(...) right before (or right after) its .play(), in the same block, so every play asks for a new pitch. Help: 5.2.1 (Reading: Random numbers and timers) | regex, whole file |
| r2 | A miss plays one of several sounds | Several sounds sit in a list, and an if block plays the one at a random position: list[floor(random(list.length))].play(), or the same in two lines, with any names. Help: 5.2.1 (Reading: Random numbers and timers) | regex, whole file |

#### 6.11.7 Lab: Music for every screen

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | A new screen stops the old music | Inside goTo(next), a sound's .stop() runs, so the last screen's music cannot carry on under the next one. Help: 6.11.6 (Reading: Music that follows the game) | inFunction `goTo` (or 9 other names for it) |
| r2 | The title and the game loop the tune | Inside goTo(next), .loop() runs under an if (or a case) on the screen being entered: one for the title and one for the game, or one if that asks for both. Help: 6.11.6 (Reading: Music that follows the game) | inFunction `goTo` (or 9 other names for it) |
| r3 | A win and a loss play it once | Inside goTo(next), .play() runs under an if (or a case) on the screen being entered: one for a win and one for a loss, or one if that asks for both. Help: 6.11.6 (Reading: Music that follows the game) | inFunction `goTo` (or 9 other names for it) |

#### 6.11.8 Lab: A settings screen that remembers

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | Up and down change the level | Under kb.presses, one key raises level by 1 and another lowers it, and level is what masterVolume uses (through applySound). Any variable name works. Help: 6.3.3 (Reading: moSHion docs: Input edges) | regex, whole file |
| r2 | M flips the sound off and on | Under a kb.presses test, muted is flipped (muted = !muted, or an if and an else), or masterVolume is set. Help: 6.11.6 (Reading: Music that follows the game) | regex, whole file |
| r3 | A change is saved | storeItem runs when a key changes a setting: inside that if, or in a function it calls, such as soundChanged(). Help: 6.5.3 (Reading: storeItem: Save Game Data) | regex, whole file |
| r4 | The settings are loaded at the start | setup() (or loadSettings(), which it calls) reads a setting with getItem and deals with the null that comes back when nothing was saved: !== null, === null, ?? or \|\|. Help: 6.5.5 (Reading: getItem: Load Saved Data) | inFunction `setup` (+9 loader names, such as `loadSettings`) |

#### 6.11.10 Challenges: Make it yours

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | You added one sound rule | Any one challenge turns this green: a streak that sets the chime's rate, a pan, or slices of one file (or a sound rule of your own, such as a fade, or a rate that follows the score). Help: 6.11.5 (Lab: A sound that varies) | regex, whole file |
| r2 | You wrote your sentence | A // comment of at least four words at the top of the file, above the first line of code, saying what your rule is and what the game would sound like without it. Any wording works; only the title line already at the top, which starts with the lesson number, does not count. Help: this lab's step 2 | regex, whole file, reads comments, flags i |

### What the patterns accept and refuse

Every reference scores full; every starter scores 0 (6.11.10: 0 of 2).

| Lab | Accepted (honest shapes) | Refused (wrong or cheating) |
| --- | --- | --- |
| 6.11.3 | own names and double quotes; relative or full-URL paths; play first or last in the block; Allman braces; one-line `if`s; an alias (`const caught = star.overlaps(basket)`, `const missed = star.y > 410`); a helper called from the `if`, defined before or after; `basket.overlaps(star)`; `>= 400`, `410 < star.y`, `height + 10`; an `overlaps` callback; `star.overlaps(basket) && chime.play()`; loads in a `loadSounds()` helper | plays straight in `draw()`, under `kb.pressing` or `kb.presses('space')`, after the catch block closes, after an empty `if`, in a string or comment, only in `setup()`; loads in `draw()`; a misspelled path; a miss sound under `star.y > 0` |
| 6.11.4 | `music.volume += 0.1` keys; `level++`/`--` with clamps after; `min`/`max`/`constrain`; any variable name; keys that set `masterVolume(level / 10)`; one ternary line for both keys; W/S keys with the clamp first; `level * 0.1`; mute by a flipped flag, by `masterVolume(masterVolume() > 0 ? 0 : 1)`, or by `=== 1` with braces; `loop()` in `draw()` under `!music.playing`; a `startMusic()` helper | keys under `kb.pressing`; keys that step `score`; a level nothing turns into a volume; one key only; empty key `if`s; a mute that never comes back; muting only the tune; `play()` for `loop()`; a tune at volume 1; `loop()` in a string |
| 6.11.5 | `0.8 + random(0.45)`; `random([...])`; the rate set after the play; `Math.random()`; the rate re-rolled at the top of `draw()`; `random(thuds).play()`; one-line `thuds[floor(random(3))].play()`; a picked-sound alias; `Math.floor(Math.random() * n)`; a list built with `push` in a loop; `[low, mid, high]` | a random rate set once in `setup()`; a random number that is not the rate; the rate only in a comment; the pick played straight in `draw()`; always `thuds[0]`; `thuds[random(3)]` (no `floor`); the pick in a string |
| 6.11.7 | `switch (next)`; an `else if` chain with `==` and double quotes; separate tune objects each stopped; one `if` with `||` per kind; loop-or-play by `if`/`else`; `changeState(s)` renamed throughout; `stop()` after `state = next`, or `pause()`; a lookup table `loops[next].loop()` | a `loop()` or `play()` with no `if`; no `stop()`; empty `if`s with the calls after; the music moved into `draw()`; the music lines in a string |
| 6.11.8 | mute by `if`/`else` or `muted ? false : true`; `storeItem` in each key `if`; a `saveSettings()` helper called from `soundChanged()` (two helpers deep); one saved object; `?? 5`; `=== null` with `else`; `typeof v === 'number'`; `level++`/`--` with clamps; the load lines straight in `setup()`; `Number(saved)` after `!== null` | `storeItem` only in `setup()`, every frame in `draw()`, or in a helper nothing calls; `getItem` with no null case; M that does something else; level keys under `kb.pressing`; one key only; an empty M `if` |
| 6.11.10 | each challenge alone with a sentence; a `fade()` on the lost screen; a rate that follows the score | a sentence alone; a challenge with no sentence; a sentence that starts with a lesson number; a two-word comment; a challenge in a string |

Declared, left lax on purpose: `loop/sound-fix-cases.md`, "Declared, left lax on purpose".

Gate axes (`scripts/audit-grader-tolerance.mjs --gate`): 0 hits course-wide. The full 6.11 sweep (13 axes) reports one hit:
6.11.10 r2 refuses `/* */` instead of `//`, tagged maybe-intentional (the step asks for `//`; 6.10.13 r2 is the same).

### The pattern source

The patterns are built from named fragments by this file (part of the generator; `lesson.json` holds the built strings):

```js
// Requirement patterns for module 6.11, built from named fragments.
// Rules: no lookbehind; every named group is unique within one pattern (gid());
// strings are blanked and comments stripped by the grader before these run.

let n = 0;
export const gid = (p) => `${p}${++n}`;

export const ID = String.raw`[A-Za-z_$][\w$]*`;
// The end of a receiver expression just before `.method(`: chime.play(, thuds[pick].play(, a?.play(
const RECV = String.raw`[\w$\])]\s*\??\.\s*`;
export const PLAY = RECV + String.raw`play\s*\(`;
export const LOOP = RECV + String.raw`loop\s*\(`;
export const STOP = RECV + String.raw`(?:stop|pause)\s*\(`;

// if (<head that contains cond>) -- cond is a plain fragment with no named groups.
export const IF = (cond) => String.raw`\bif\s*\((?=[^;{}]{0,200}?(?:${cond}))[^;{}]{0,200}\)\s*`;
// What may stand between an if head and the target while staying inside the if body:
// a braced body (one level of nested blocks skipped whole) or one unbraced statement.
export const BODY = String.raw`(?:\{(?:[^{}]|\{[^{}]*\}){0,600}?|[^;{}]{0,200}?)`;
// The same, but the target may also sit inside a nested block (it may enter a block, never leave one).
export const BODYN = String.raw`(?:\{(?:[^{}]|\{[^{}]*\}|\{){0,600}?|[^;{}]{0,200}?)`;
// A function body scanned for a target (may enter nested blocks, never leaves the function).
const FNBODY = String.raw`\{(?:[^{}]|\{[^{}]*\}|\{){0,800}?`;

const T = (t) => (typeof t === 'function' ? t() : t);

// The target runs only when cond is true: inside the if, after `cond &&`, through an alias
// (const hit = <cond>; if (hit) ...), or in a helper function called from inside the if.
export function underIf(cond, target, { nested = false } = {}) {
  const B = nested ? BODYN : BODY;
  const c = gid('c'), h1 = gid('h'), h2 = gid('h');
  return [
    IF(cond) + B + `(?:${T(target)})`,
    `(?:${cond})[^;{}]{0,160}?&&[^;{}]{0,160}?(?:${T(target)})`,
    String.raw`\b(?:(?:const|let|var)\s+)?(?<${c}>${ID})\s*=(?![=>])[^;\n]{0,200}?(?:${cond})[^;\n]{0,200}[;\n][\s\S]{0,800}?` +
      IF(String.raw`\b\k<${c}>\b`) + B + `(?:${T(target)})`,
    String.raw`\bfunction\s+(?<${h1}>${ID})\s*\([^)]*\)\s*${FNBODY}(?:${T(target)})[\s\S]*?` + IF(cond) + B + String.raw`\b\k<${h1}>\s*\(`,
    IF(cond) + B + String.raw`\b(?<${h2}>${ID})\s*\(\s*\)[\s\S]*?\bfunction\s+\k<${h2}>\s*\([^)]*\)\s*${FNBODY}(?:${T(target)})`,
  ].join('|');
}

// ---- conditions --------------------------------------------------------------

export const CATCH = String.raw`\b(?:overlap\w*|collid\w*)\s*\(`;
// A sprite's y past the bottom: y > 360..999 or height (either way round, with an offset).
const YV = String.raw`\b[\w$]+\s*\.\s*(?:y|pos\s*\.\s*y)\b`;
const OFF = String.raw`(?:\s*[-+]\s*\(?\s*[\w.]+(?:\s*\/\s*\d+)?\s*\)?)?`;
const BOTTOM = String.raw`(?:3[6-9]\d|[4-9]\d\d|height|windowHeight|canvas\s*\.\s*h)\b`;
export const MISS = String.raw`${YV}${OFF}\s*\)?\s*>=?\s*\(?\s*${BOTTOM}|\b${BOTTOM}${OFF}\s*\)?\s*<=?\s*\(?\s*${YV}`;
export const PRESSES = String.raw`\bkb\s*\.\s*(?:presses|pressed|released)\s*\(`;

// ---- 6.11.3 -----------------------------------------------------------------

const PATH = String.raw`['"\x60](?:(?:https?:\/\/[^'"\x60\s]*)?\/moshion\/assets\/|(?:\.\/)?assets\/)(?:coin|music)\.wav['"\x60]`;
// inFunction setup (+ helpers): something = loadSound(path)  (or a list of them)
export const L3_R1 = String.raw`=\s*\[?\s*loadSound\s*\(\s*${PATH}|\.\s*push\s*\(\s*loadSound\s*\(\s*${PATH}`;
// overlaps(other, callback): the callback runs for the overlap
const CALLBACK = (target) => String.raw`\.\s*(?:overlap\w*|collid\w*)\s*\([^;{}]{0,120}?(?:=>|\bfunction\b[^{]{0,60})\s*${BODY}(?:${target})`;
export const L3_R2 = () => underIf(CATCH, PLAY) + '|' + CALLBACK(PLAY);
export const L3_R3 = () => underIf(MISS, PLAY);

// ---- 6.11.4 -----------------------------------------------------------------

export const L4_R1 = LOOP;
// inFunction setup (+ helpers): a .volume below 1
export const L4_R2 = String.raw`\.\s*volume\s*=(?!=)\s*\(?\s*(?:0?\.\d*[1-9]\d*|[1-9]\d*\s*\/\s*\d+|${ID}\s*\/\s*\d+|${ID}\s*\*\s*0?\.\d+)`;

// One key steps a level (or a volume) up, another steps it down, and the level is
// what sets a volume (.volume = ... level ..., or masterVolume(... level ...)).
function stepper(sign) {
  const s = sign === '+' ? String.raw`\+` : '-';
  const v1 = gid('v'), v2 = gid('v'), w = gid('w');
  const NUM = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;
  const VARSTEP = String.raw`\b(?<${v1}>${ID})\s*(?:${s}=\s*${NUM}|${s}${s}|=(?![=>])\s*(?:(?:Math\s*\.\s*)?(?:min|max|constrain)\s*\(\s*)?\k<${v1}>\s*${s}\s*${NUM})|${s}${s}\s*(?<${v2}>${ID})\b`;
  const PROPSTEP = String.raw`\.\s*volume\s*(?:${s}=|=(?![=>])\s*[\w$.\s]*\bvolume\s*${s})|\bmasterVolume\s*\(\s*masterVolume\s*\(\s*\)\s*${s}`;
  const TIE = (v) => String.raw`(?:\.\s*volume\s*=(?![=>])|\bmasterVolume\s*\()[^;\n]{0,160}\b${v}\b`;
  const SET = String.raw`(?:\.\s*volume\s*=(?![=>])|\bmasterVolume\s*\()`;
  return String.raw`(?=[\s\S]*?(?:` + [
    // key if steps a variable, the variable sets a volume later in the file
    IF(PRESSES) + BODY + String.raw`(?:${VARSTEP})[\s\S]*?${TIE(String.raw`\k<${v1}>\k<${v2}>`)}`,
    // the variable sets a volume earlier in the file (e.g. in setup or applySound)
    SET + String.raw`[^;\n]{0,120}?\b(?<${w}>${ID})\b(?=\s*[\/*),;:?])[\s\S]*?` + IF(PRESSES) + BODY + String.raw`(?:\b\k<${w}>\s*(?:${s}=\s*${NUM}|${s}${s}|=(?![=>])\s*(?:(?:Math\s*\.\s*)?(?:min|max|constrain)\s*\(\s*)?\k<${w}>\s*${s}\s*${NUM})|${s}${s}\s*\k<${w}>\b)`,
    // the key if steps the volume itself
    IF(PRESSES) + BODY + String.raw`(?:${PROPSTEP})`,
    // level += kb.presses('up') ? 1 : ... (one line for both keys)
    String.raw`\b[\w$.]+\s*[+-]=\s*\(?\s*kb\s*\.\s*(?:presses|pressed|released)\s*\(`,
  ].join('|') + '))';
}
export const UPDOWN = () => '^' + stepper('+') + stepper('-');

// M: under a kb.presses test, masterVolume(...) is set or a variable is flipped,
// and somewhere masterVolume is given something other than 0, so the sound can come back.
export function TOGGLE() {
  const a = gid('t'), b = gid('t'), c = gid('t'), d = gid('t'), e = gid('t');
  return [
    String.raw`\b(?<${a}>${ID})\s*=(?![=>])\s*\(?\s*!\s*\(?\s*\k<${a}>\b`,
    String.raw`\b(?<${b}>${ID})\s*=(?![=>])\s*\(?\s*\k<${b}>\s*\)?\s*\?\s*false\s*:\s*true\b`,
    String.raw`\b(?<${c}>${ID})\s*=(?![=>])\s*\(?\s*\k<${c}>\s*===?\s*false\b`,
    String.raw`\b(?<${d}>${ID})\s*(?:=(?![=>])\s*1\s*-\s*\k<${d}>\b|\^=\s*(?:1|true)\b)`,
    String.raw`\bif\s*\(\s*!?\s*(?<${e}>${ID})\s*(?:===?\s*(?:true|false)\s*)?\)\s*\{?\s*\k<${e}>\s*=(?![=>])\s*(?:true|false)\b[^{}]{0,80}?\}?\s*else\s*\{?\s*\k<${e}>\s*=(?![=>])\s*(?:true|false)\b`,
  ].join('|');
}
const MV_SET = String.raw`\bmasterVolume\s*\(\s*[^)\s]`;
const MV_BACK = String.raw`\bmasterVolume\s*\(\s*(?!0\s*\))[^)\s]`;
export const MUTE = () => String.raw`^(?=[\s\S]*?${MV_BACK})(?=[\s\S]*?(?:${underIf(PRESSES, () => `${MV_SET}|${TOGGLE()}`, { nested: true })}))`;

// ---- 6.11.5 -----------------------------------------------------------------

const RAND = String.raw`\b(?:random|Math\s*\.\s*random)\s*\(`;
const RATE_RAND = String.raw`\.\s*rate\s*(?:=(?![=>])|\+=|-=|\*=)[^;{}\n]{0,80}?${RAND}`;
export const L5_R1 = String.raw`${RATE_RAND}(?:[^{}]|\{){0,400}?${PLAY}|${PLAY}(?:[^{}]|\{){0,400}?${RATE_RAND}`;

export function PICK() {
  const ix = gid('ix'), ps = gid('ps');
  const FLOORRAND = String.raw`(?:floor|Math\s*\.\s*floor|int|round|Math\s*\.\s*round)\s*\(\s*${RAND}`;
  return [
    String.raw`\b${ID}\s*\[\s*${FLOORRAND}[^\]]{0,80}\]\s*\??\.\s*play\s*\(`,
    String.raw`\b(?:(?:const|let|var)\s+)?(?<${ix}>${ID})\s*=(?![=>])\s*${FLOORRAND}[^;\n]{0,80}[;\n][^{}]{0,300}?\b${ID}\s*\[\s*\k<${ix}>\s*\]\s*\??\.\s*play\s*\(`,
    String.raw`\brandom\s*\(\s*[\w$.]+\s*\)\s*\??\.\s*play\s*\(`,
    String.raw`\b(?:(?:const|let|var)\s+)?(?<${ps}>${ID})\s*=(?![=>])\s*(?:random\s*\(\s*[\w$.]+\s*\)|${ID}\s*\[\s*${FLOORRAND}[^\]]{0,80}\])\s*;?[^{}]{0,300}?\b\k<${ps}>\s*\??\.\s*play\s*\(`,
  ].join('|');
}
// a list of two or more sounds, and a random one of them played under an if
const LIST = String.raw`\[\s*(?:loadSound\s*\([^)]*\)|${ID})\s*,\s*(?:loadSound\s*\(|${ID})|\.\s*push\s*\(\s*[A-Za-z_$]`;
// under any if: inside its body, or in a helper called from inside it
function underAnyIf(target) {
  const IFANY = String.raw`\bif\s*\([^;{}]{0,200}\)\s*`;
  const h1 = gid('h'), h2 = gid('h');
  return [
    IFANY + BODY + `(?:${T(target)})`,
    String.raw`\bfunction\s+(?<${h1}>${ID})\s*\([^)]*\)\s*${FNBODY}(?:${T(target)})[\s\S]*?` + IFANY + BODY + String.raw`\b\k<${h1}>\s*\(`,
    IFANY + BODY + String.raw`\b(?<${h2}>${ID})\s*\(\s*\)[\s\S]*?\bfunction\s+\k<${h2}>\s*\([^)]*\)\s*${FNBODY}(?:${T(target)})`,
  ].join('|');
}
export const L5_R2 = () => String.raw`^(?=[\s\S]*?(?:${LIST}))(?=[\s\S]*?(?:${underAnyIf(PICK)}))`;

// ---- 6.11.7 (inFunction goTo) ------------------------------------------------

export const L7_R1 = STOP;
const CONDB = String.raw`(?:\bif\s*\([^;{}]{0,200}\)\s*(?:\{[^{}]{0,300}?|[^;{}]{0,160}?)|\belse\b(?!\s*if\b)\s*(?:\{[^{}]{0,300}?|[^;{}]{0,160}?)|\bcase\b[^:;{}]{0,60}:[^{}]{0,300}?|\?[^;{}]{0,120}?|&&[^;{}]{0,120}?)`;
const twoOr = (M) => [
  String.raw`^(?=(?:[\s\S]*?${CONDB}${M}){2})`,
  String.raw`\bif\s*\((?=[^;{}]{0,200}\|\|)[^;{}]{0,200}\)\s*(?:\{[^{}]{0,300}?|[^;{}]{0,160}?)${M}`,
  String.raw`\belse\b(?!\s*if\b)\s*(?:\{[^{}]{0,300}?|[^;{}]{0,160}?)${M}`,
  String.raw`\[\s*${ID}\s*\]\s*\??\.\s*${M.slice(RECV.length)}`,
].join('|');
export const L7_R2 = twoOr(LOOP);
export const L7_R3 = twoOr(PLAY);

// ---- 6.11.8 -----------------------------------------------------------------

export const L8_R1 = UPDOWN;
export const L8_R2 = MUTE;
const STORE = String.raw`\bstoreItem\s*\(`;
export function L8_R3() {
  const y = gid('y'), x = gid('x');
  return underIf(PRESSES, STORE, { nested: true }) + '|' +
    // two helpers deep: key if -> x() -> y() -> storeItem
    String.raw`^(?=[\s\S]*?\bfunction\s+(?<${y}>${ID})\s*\([^)]*\)\s*${FNBODY}${STORE})` +
    String.raw`(?=[\s\S]*?\bfunction\s+(?<${x}>${ID})\s*\([^)]*\)\s*${FNBODY}\b\k<${y}>\s*\()` +
    String.raw`(?=[\s\S]*?${IF(PRESSES)}${BODYN}\b\k<${x}>\s*\()`;
}
// inFunction setup (+ loaders): a value read with getItem, and a null case handled
export const L8_R4 = String.raw`^(?=[\s\S]*?\bgetItem\s*\()(?=[\s\S]*?(?:\bnull\b|\?\?|\|\||\btypeof\b|\bif\s*\(\s*!?\s*${ID}\s*\)))`;

// ---- 6.11.10 ----------------------------------------------------------------

export const L10_R1 = String.raw`\.\s*pan\s*=(?![=>])|\bclips\s*:|\.\s*play\s*\(\s*[^)\s]|\.\s*fade\s*\(|\.\s*rate\s*(?:\+=|-=|\*=|\/=)|\.\s*rate\s*=(?![=>])(?![^;\n]*\brandom\s*\()[^;\n]*[A-Za-z_$]`;
// copied from 6.10.13 r2 (reads comments: flags i, stripComments false)
export const L10_R2 = String.raw`^(?:[ \t]*(?:\/\/[^\n]*)?\r?\n)*?[ \t]*\/\/[ \t]*(?!\d+\.\d)(?:\S+[ \t]+){3}\S|\/\/[^\n]*\b(?:would|without|otherwise|instead|if|remov\w*)\b`;
```

---

## 8. Reference scripts

### 8.0 How the lab scripts are made

As in 6.10: each lab is ONE marked source; `solution.js` is the source with the markers removed and `script.js` (the starter)
replaces each block with a wrapped `// STEP N: <text>` comment, followed by any `//--` starter lines (used where a step
CHANGES lines the starter already has: 6.11.5 s2). Everything outside a marker is identical in both. The STEP texts:

```js
{
  L3: {
    s1: 'load two sounds here, once: the chime from the coin file, and the thud from the same file at half speed.',
    s2: 'play the chime here, once for each catch.',
    s3: 'play the thud here, once for each miss.',
  },
  L4: {
    s1: 'load the tune, set its volume from level, and start it looping.',
    s2: 'up adds 1 to level (only below 10) and down takes 1 away (only above 0); each time, set the tune\'s volume from level.',
    s3: 'M turns every sound off, and on again.',
  },
  L5: {
    s1: 'give the chime a new random rate here, for every catch.',
    s2a: 'change this line: thud becomes thuds, a list.',
    s2b: 'change these two lines: a list of three sounds from the coin file, each with its own rate.',
    s2c: 'change this line: play one of the thuds, picked at random.',
  },
  L7: {
    s1: 'stop whatever is playing.',
    s2: 'loop the tune on the title (rate 0.8) and in the game (rate 1).',
    s3: 'play it once for a win (rate 1.25) and for a loss (rate 0.6).',
  },
  L8: {
    s1: 'up adds 1 to level (only below 10), down takes 1 away (only above 0), and M flips muted. Each one then calls soundChanged().',
    s2: 'save level and muted.',
    s3: 'read level and muted back; use each only when one was saved.',
  },
}
```

The shipped files are the record (`lessons/6-11-sound-*/solution.js` and `script.js`); they are not pasted here. Hashes
(first 12 hex of SHA-256):

| Folder | solution.js | script.js |
| --- | --- | --- |
| `6-11-sound-3-lab-a-sound-on-an-event` | `d2f5452c2f89` | `4fa9f52fda42` |
| `6-11-sound-4-lab-music-volume-and-a-mute-key` | `e35de128f017` | `849d9651360d` |
| `6-11-sound-5-lab-a-sound-that-varies` | `37e25d9cd2ad` | `a1f82e6062fa` |
| `6-11-sound-7-lab-music-for-every-screen` | `15b3a58477d9` | `a1feb3ac3091` |
| `6-11-sound-8-lab-a-settings-screen-that-remembers` | `1dca64419eca` | `e5f2c80697bb` |
| `6-11-sound-10-challenges-make-it-yours` | `8795acb8a9b3` | `4e9a6f5c4713` |

---

## 9. How this was checked

1. **Headless, the course's own engine** (`scripts/moshion-harness.mjs` and its `FakeAudioContext`, the vendored
   `public/moshion/moshion.js`), every Web Audio call read from the harness's `audioLog`:
   - all six starters and six references run 600 frames, draw, and throw nothing;
   - 6.11.3: a catch starts one voice at rate 1 and adds 1 to `caught`; a miss starts one at rate 0.5; 1200 unattended
     frames give exactly one start per event (10 and 10); the starter starts nothing in 900 frames;
   - 6.11.4: `loop()` in `setup()` starts one looping voice once the file arrives; the tune starts at 0.4; three ups give
     level 7 and volume 0.7; level stops at 10 and at 0; holding down 30 frames is one step; M gives `masterVolume` 0 then 1;
     still one looping voice 600 frames later;
   - 6.11.5: 12 catches give 12 chimes, every rate in [0.8, 1.25), 8 or more different; 30 misses use all three thud rates
     and nothing else;
   - 6.11.7: title loops at 0.8; Enter stops it and loops at 1; `score = 10` gives `'won'`, one non-looping voice at 1.25 and
     no loop; R stops it and loops at 0.8; three misses give `'lost'` and one voice at 0.6. **Race:** Enter before the file
     has downloaded leaves exactly one loop, at the game's rate 1. The same race with two tune objects starts both loops
     (risk 2), which is why the module uses one;
   - 6.11.8: first run level 5, sound on, `masterVolume` 0.5; O opens the options (title tune still looping); two ups give
     level 7, `masterVolume` 0.7 and one sample chime each; `soundLevel` saved as 7; M mutes and saves `true`; level stops
     at 0 and saves 0; O goes back. A next run with `soundLevel` 0 saved comes back 0 (with `|| 5` it comes back 5: the
     trap step 3 names); a next run with 8 and muted comes back 8 and muted;
   - 6.11.10 reference: four catches in a row give chime rates 1.1, 1.2, 1.3, 1.4, each with one tune slice (offset 1.3 or
     2.6, duration 1.3 or 1.4); a catch at x 100 pans the chime to -0.5; a miss resets the streak;
   - 6.11.2 live block and Try items 1-4 as in section 4.
2. **Real Chrome** (`playwright-cli`, throwaway session `sound`, headless Chrome 156, closed afterwards), with a host page
   that frames `/moshion/runner.html?code=...` exactly as `components/MoshionPreview.tsx` does (same `sandbox` and
   `allow="autoplay; ..."`, same storage bridge as `lib/moshion-storage.ts`), served from `public/` by a scratch server
   that sends `Access-Control-Allow-Origin: *` as `public/_headers` does for `/moshion/assets/*`. An instrument prepended
   to each sketch wrapped `AudioContext`, counted every `AudioBufferSourceNode.start`/`stop`, and tapped the master output
   with an `AnalyserNode`:
   - **6.11.8, the whole game:** the title renders inside the canvas (screenshot); a real click and O open the options; two
     real ups and M give level 7 and `masterVolume` 0; the host page's store holds `{"soundLevel":"7","soundMuted":"true"}`;
     **after a reload** the sketch starts at level 7 and muted; M back on, O, Enter loops the tune at rate 1; three real
     misses give `'lost'` and one non-looping voice at 0.6 (screenshot: "Three got away. Press R"); R loops the title at
     0.8 again;
   - **6.11.3:** nine unattended seconds: 6 voices started for 6 events;
   - **6.11.2 live block:** 1 2 3 4 then T three times: 5 voices (four chimes, rates ending 1.5, and one loop); X stops it;
   - **The silent files (section 0):** in every run above, with `coin.wav` and `music.wav`, the context was running and
     voices were playing, and the output peak was **0**. The same live block with the two paths pointed at test tones
     generated in the scratchpad (not in the repo) peaked at **0.21**: the code path is audible, the files are not.
   - **The browser's gesture rule could not be shown.** This automated Chrome started the iframe's audio with no gesture,
     both by default and with `--autoplay-policy=user-gesture-required` (context `'running'` within 0.7 s, peak 0.21 on the
     test chord). So the lessons say a browser *may* hold sound back and tell the student to click the game; nothing claims
     either outcome for a given browser. Whether the click on Run counts inside the app's `allow="autoplay"` iframe on a
     classroom Chromebook is unverified.
3. **Grading** with the app's own `lib/grader.ts`: 129 cases, 0 mismatches (`loop/sound-fix-cases.md`), plus the timing.
4. **Repo gates** after regenerating (`generate-module-docs`, `generate-lessons-manifest`, `generate-ai-graders`,
   `generate-quiz-keys`, `generate-solutions`, `generate-lesson-starters`): `check-lesson-numbers` (848 lessons, no
   collisions), `check-lesson-groups` (6.11.json: 4 lessons over 10 screens), `check-prompt-pointers` (all pass),
   `check-help-pointer-titles` (the 10 known older mismatches, none in 6.11), `check-lesson-citations` (every number
   resolves, no stale-numbering finding, the 2 known older forward notes), `check-hints` (382 requirements all carry a
   hint), `check-live-blocks` (491 blocks, all match), `check-starters` (every reference full, every starter not),
   `check-solution-leak`, `test-quiz` (36 quizzes, 287 questions), `test-grader-tolerance` (334 cases),
   `audit-grader-tolerance --gate` (0 hits), `tsc --noEmit` (exit 0); beyond the list, `test-moshion.mjs --corpus`
   (503/503; 17/17 in 6.11), `check-concept-order`, `test-lesson-title-order`.

Not checked: the lesson pages in the app (no dev-server walk), the real gesture rule (above), and no cs-student lens
(beginner, moderate, advanced) has walked the module.

---

## 10. Module doc and groups

- `curriculum/modules/6.11_sound-and-music.md`: `id "6.11"`, `title Sound and Music`, `quarter 2`, `weeks: [18]`,
  `environment moSHion`, `status draft`; header "Quarter 2 · Week 18 · after §6.10 Breakout"; SLO focus, goal, pre- and
  post-requisite snapshots, a note (not a book section, a concept module, the two files and that they are silent, one tune
  object, the save keys, words in `drawTop()`), the one idea ("a sound belongs to an event, not to a frame"), assessments.
- `curriculum/groups/6.11.json`: four lessons, `sound-in-a-sketch` (6.11.1-6.11.2), `sound-on-events` (6.11.3-6.11.5),
  `music-and-settings` (6.11.6-6.11.8), `check-and-extend` (6.11.9-6.11.10). The `source` line names Game Design 4.6 and
  the book's chapter 6.10 as structure only.

---

## 11. Risks, decisions for the owner, and open questions

**Decided here (the owner should know):**

1. **6.11, week 18** (header of this file). Week 18 becomes 677 min, 1.5 x the Q2 average, with 6.10 and 7.1 in it.
   6.11.10 (25 min) is the obvious extension to move to homework.
2. **A concept module with one small game**, not sound added to Breakout and not a build with an AI-graded plan and
   playtest.
3. **One tune object, its rate per screen**, rather than a file per screen (only one tune exists, and it closes risk 2).
4. **Settings keys `soundLevel` and `soundMuted`.**
5. **The browser rule is worded as "may"** in every lesson (section 9, item 2).
6. **5.11.9 is not changed.** This module re-teaches its basics in 6.11.1 and cites it; nothing in 5.11 was edited.

**Risks:**

1. **The course's two sound files are silent (section 0).** This blocks the module from being heard at all, and it already
   silences 5.11.9 and the docs' Sound example. Needed: real audio in `coin.wav` (a short chime, about 0.2 s) and
   `music.wav` (a loop of about 5.3 s; challenge 3 slices it at 1.3, 2.6 and 4 s, so four equal parts is the assumption),
   made in the moSHion repo (`assets/`), licence-clean, and re-vendored by `public/moshion/VENDORED.md`'s steps. Nothing in
   6.11 changes when they arrive. Not done here: no new audio was to be added, and no script in either repo makes them.
2. **Engine: `stop()` does not cancel a remembered `loop()`.** `Sound.loop()` asked for before the file has arrived sets
   `_pendingLoop` and starts when the file lands; `stop()` clears only playing voices. With two tune objects, leaving the
   title before the download finishes starts both loops (measured, section 9). 6.11 avoids it with one object; a student's
   own two-file game (or challenge work) can still meet it on a slow network. A one-line engine fix (`stop()` clears
   `_pendingLoop`) belongs in the moSHion repo, not here.
3. **`fade(0, s)` leaves the sound's volume at 0**, so its next `loop()` or `play()` is silent until `.volume` is set back.
   No lab uses `fade`; 6.11.10 accepts it as a rule of your own, and its graded own-rule case sets the volume back first.
4. **The gesture rule is unverified in the app** (section 9). If a Chromebook holds sound back after Run, every lab's
   step already says to click the game; if it does not, nothing is lost.
5. **`lib/moshion-docs.ts` (Sound) loads `'coin.mp3'` and `'music.mp3'`**, files that do not exist in shCode (found while
   reading; not edited). A student copying the docs' example gets silence for a second reason.
6. **The grader is lax by design** (declared list in `loop/sound-fix-cases.md`): `if (true)` around the music in `goTo`,
   `|| 5` in the load, one sound in `dropStar()`, no level clamp. Each shows up in play.
7. **Only the course's own checks and two real-browser runs so far.** No student lens has walked it.

**Open questions:**

1. Should 6.11 sit in week 17 instead (it would make week 17 2.1 x the Q2 average), or should 6.11.10 be homework?
2. Should a pan or a fade be a lab rather than a challenge once the files are audible (they are only worth teaching when
   heard)?
3. The renumber (PLACEMENT item 12) will move `6.11.N` with the rest of chapter 6; the folder prefix `6-11-sound-` stays.
