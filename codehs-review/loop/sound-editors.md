# 6.11 Sound and Music: runnable-editor audit (6 labs, 1 live block)

Run by cs-function-audit on 2026-11-01 against HEAD `689f2e27` (working tree clean for `lessons/`; no lesson file was edited).
Dev server localhost:3002 (DEV_ROLE=student). playwright-cli session `snd-editors` (headless Chromium), cookie `dev_student=sndeditors`.
Its lesson-state rows were deleted and the session closed at the end. `mom`, `codehs`, `launcher`, `motion`, `stats45` untouched, nobody pkill'd.
Measurements, not verdicts: the pass/fail call is the human's.

**Result: no functional gap. Every starter and every `solution.js` runs, draws, and reaches the audio engine as documented, in node and in a
real browser. Three presentation gaps (one text-vs-sketch count, two clipped code strings in drawers) and three notes.**

## Editors in scope
6 moSHion labs (6.11.3, 6.11.4, 6.11.5, 6.11.7, 6.11.8, 6.11.10; each has `script.js` + `solution.js`) and 1 `js live` block (6.11.2).
6.11.1 and 6.11.6 hold only static `js` fences (no editor, no Run button, measured: 0 iframes, 0 `.cm-editor`). 6.11.9 is a quiz (no editor).
The four CS lenses map as: editor-kind = each editor mounted `/moshion/runner.html` in an iframe (7 of 7); silent-no-output = canvas pixel census
and Console panel (below); output-claim = documented text vs measured behaviour; async-output n/a (no `console.log` fence in the module).

## Method
- **Node half** (`scripts/moshion-harness.mjs`, unmodified, plus a subclass of its FakeAudioContext that records every BufferSource `start`
  with rate/pan/gain/offset/duration, every `stop`, and every write to the master gain). 12 sketches (6 starters, 6 solutions), real key
  events, star/basket placed to force a catch or a miss, engine state read back (`music._loopVoice`, `music._voices`, `masterVolume()`).
  128 checks, 0 mismatches after I corrected two flaws in my own first-draft checks (a random natural catch inside an "idle" window; the fake
  context never ends one-shot voices, so I read `music._voices` instead of counting starts).
- **Browser half**: for each lab, the real lesson page. An init script wraps `AudioContext` inside the runner iframe so the REAL Web Audio engine
  path is recorded (starts with rate/pan/gain/buffer duration, stops, master-gain writes, context state). Starter and solution both loaded into
  CodeMirror, real Run button, real keyboard into the focused iframe canvas, sketch globals read back. Per lab: Steps and Quest drawers measured for
  spill/clip, hints expanded and re-measured, console and page `console`/`pageerror` events collected, canvas pixel census, frames advance read twice.
- **Static**: `check-live-blocks` (491 blocks all match), `check-hints` (382 requirements all carry a hint), `check-starters` (every reference scores
  full, every starter does not) all green. Step code blocks and inline hint code in every lab were diffed against the matching `solution.js`
  line by line (comment-stripped): every line is present in the solution; only exception is the prose hint `music.volume = 0`, which is a counter-example by design.
- Peak of `coin.wav` and `music.wav` is 0 (known, not a finding). Durations: coin 0.19 s, music 5.333 s; the "about a fifth of a second" and
  "about five seconds" claims in 6.11.1 hold, and the 6.11.10 slice `four: [4, 5.3]` ends inside the file.

## Per-lab results (node = harness, br = real browser)

| Lab | Starter: runs / draws / quest | Starter audio | Solution: quest | Documented behaviour measured |
|---|---|---|---|---|
| 6.11.3 | ok / 75 colours, frames 106 -> 136 / 0/3 | none (0 starts, 0 decodes) | 3/3 | catch = 1 start rate 1, buf 0.19 s, ctx running; miss = 1 start rate 0.5; idle = 0; br 9 s natural play: 4 starts for 4 events (caught + missed); node 900 frames starts 6 = caught 1 + missed 5 |
| 6.11.4 | ok / 141 / 0/4 | effects only, no loop | 4/4 | br: loop voice at setup, gain 0.4, no `blocked`, no `error`; Up: level 5, vol .5, live voice gain .5; 9 Ups = 10, vol 1; 12 Downs = 0, vol 0; M: master gain writes `[0]` then `[0,1]`, tune vol untouched; holding Up 60 frames = 1 step |
| 6.11.5 | ok / 141 / 0/2 | chime always rate 1, thud always 0.5 | 2/2 | br 14 catches: 14 distinct rates in [0.808, 1.2445]; 18 misses: exactly {0.4, 0.5, 0.6}; tune still loops at 0.4 |
| 6.11.7 | ok / 180 / 0/3 | none from title to loss (0 starts) | 3/3 | br: title loop rate 0.8; Enter: one loop, rate 1; win: no loop, one copy at 1.25; R: title loop 0.8 alone; loss: one copy at 0.6; R: 0.8 alone |
| 6.11.8 | ok / 195 / 0/4 | masterVolume 0.5 applied at start; Up/M do nothing; nothing stored | 4/4 | br: O opens settings, loop 0.8; Up Up Down Down Down: level 4, mv 0.4; M: mv 0 (master writes `[0.4, 0]`); Stop + Run: level 4, muted true restored; saved level 0 comes back 0 (not 5); the no-save version (step 1 only) goes back to level 5 / sound on after Stop + Run, as step 2 says; node: saved `7`/`false` load as a number and a boolean, first run keeps 5/false, `getItem` null path |
| 6.11.10 | ok / 195 / 0/2 | = finished 6.11.8 game, chime random 0.8-1.25 | 2/2 | br: catches 1-4 give chime rate 1.1, 1.2, 1.3, 1.4; pan -0.8 for a catch at x = 40; each catch also starts one `notes` slice (two: 1.3 / 1.3 s, three: 2.6 / 1.4 s); a miss resets streak to 0 and starts one thud; node: next catch after a miss is 1.1, ten-catch streak peaks at rate 2.0 and ends in `won`, `notes.play('zzz')` starts nothing, new game streak 0 |

All twelve sketches: no sketch errors, Console panel "No messages.", no page `console` warnings/errors, no `pageerror`, canvas never blank (75-195
distinct colours), frames advance about 30 per 500 ms. Starter of 6.11.10 equals the 6.11.8 reference apart from the title comment (diff).

### 6.11.2 live block (real browser, instrumented)
Keys 1, 2, 3, 4 start the chime at rates 0.5, 0.75, 1, 1.5. T pressed three times: exactly one loop start, `tune.playing` true; X: stop, playing false.
Five quick 1s: 5 starts (overlap). Try 2 (`kb.pressing('3')`, hold 1 s): 60 starts. Try 4 (loop in setup, T line removed): one loop start, playing true.
`chime.loaded` true, `chime.duration` 0.19, `tune.duration` 5.333, `error` null, `blocked` false.

## Gaps (numbered as found)

### G1 (minor, text vs sketch) 6.11.2 "What you'll see: four lines of words" is five lines
- `drawTop()` has five `text(...)` calls: "1 2 3 4: the chime, low to high", "T: loop the tune    X: stop it", "last chime key: ...", "chime loaded: ...",
  "tune playing: ..." (screenshot of the running block shows all five). The paragraph then describes the last two plus keys.
- Suggested fix: "five lines of words" (or "two lines of keys and three of status").

### G2 (cosmetic, clipped) 6.11.5 Quest card r2: the pick expression is cut off at the drawer edge
- Quest drawer, card "A miss plays one of several sounds": the description contains the unbreakable token `list[floor(random(list.length))].play()`.
  Measured: its span ends 153 px past the drawer's right edge; the screenshot shows the line cut at `list[floor(random(list.len`. The student can
  read the rest of the card but not the thing the card names.
- Same shape as 5.11.9 r1 in the capstone round. Suggested fix: write it with a space or a break (`list[ floor(random(list.length)) ].play()`),
  or say it in words ("pick a random position and play it").

### G3 (minor, clipped code the student has to type) 6.11.10 Steps drawer, challenge 3
- Step 1, challenge 3 gives its code inline, not as a fenced block: `notes = loadSound('/moshion/assets/music.wav', { clips: { one: [0, 1.3], ... } });`.
  The drawer wraps at spaces, so the first fragment `notes = loadSound('/moshion/assets/music.wav',` runs 27 px past the drawer (the closing `',` is at the very
  edge).
- The hint code `notes.play(names[floor(random(names.length))]);` has no space to wrap at: it ends 25 px past the right edge of the window, the final
  `);` is not visible (screenshot of the expanded hint).
- Every other lab's step and hint code (3, 4, 5, 7, 8) measured 0 px spill with all hints expanded; their fenced blocks are `pre-wrap` and wrap.
- Suggested fix: give the loadSound line a fenced block (it is the one multi-part line in the lab) and put the hint's two statements on two lines
  (`const pick = floor(random(names.length));` then `notes.play(names[pick]);`).

## Notes (not defects)
- N1. 6.11.4 step 1 says "The words now show `music: 4 of 10`", but the starter already draws `music: 4 of 10   sound: on` before any change
  (measured on the starter, node and browser). Step 1 only adds the sound; the words do not change. "The words already show" would be exact.
- N2. Saved settings are shared by name across lessons: 6.11.8 and 6.11.10 both use `soundLevel` / `soundMuted`. After my 6.11.8 run left the game muted, the
  6.11.10 starter started with master gain `[1, 0]`, i.e. silent from frame 1, and the title screen does not say so (the state shows only under `O`).
  Plausibly intended (6.11.10 says "your 6.11.8 game"); a student who muted in 6.11.8 may think 6.11.10's sound is broken.
- N3. 6.11.3 Quest drawer: two elements are 2 px wider than the drawer. Not visible; listed because the measurement fired.

## Checks I could NOT perform
- **`audit.mjs` / `cs_lenses.mjs`** (bookSHelf section-function-audit): not part of this repo and about published bookSHelf pages. The four lenses were
  applied by hand as described under "Editors in scope"; no lens output exists for them.
- **Sound itself.** Nothing was listened to (both wavs have peak 0). What was checked is every call that reaches the engine, recorded at the Web Audio
  boundary: BufferSource start/stop with rate, pan, gain, offset, duration; master-gain writes; context state.
- **The suspended-context unlock path.** Headless Chromium created every `AudioContext` already `running`, so the claim that moSHion resumes it on the first key or
  click (6.11.1, 6.11.3 s2, 6.11.4 s1) was not exercised: `resumes` stayed 0 throughout. The `play()`/`loop()` calls, the pending `loop()` that waits for the
  decoded file, and the clamping are verified; the first-gesture resume is not.
- **Reading pixels as words.** Canvas text was read from the harness's `fillText` ops (node) and from screenshots of the 6.11.2 block, the 6.11.7
  title and the 6.11.8 settings screen; the other screens' words were not viewed.
- **Grading and Submit.** The Quest regexes were not audited here (`sound-fix-cases.md` covers them); only that starter shows 0/N and the reference N/N in the real UI.
  Submit was not pressed.
- **The Docs tab** (`moshion.d.ts` / `lib/moshion-docs.ts` text for `Sound`, `masterVolume`, `pan`, `clips`) and the quiz 6.11.9 answers against the engine: the
  quiz's code claims (q4 loop in draw, q5 rate, q6 pick, q7 stop, q8 `|| 5` with a saved 0) were checked by reading against `Sound`/`getItem`, not by running.
- **Race: Enter pressed before the tune has downloaded** (6.11.7/6.11.8 `goTo` before the buffer lands). Read from the engine's `_pendingLoop`
  code (the first pending loop starts at the rate current when the file arrives); not run.
- The dev server's first cold request took 47 s; later page loads about 3 s. No other agent touched my cookie.

## Where the evidence is
Scratchpad (not in the repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/snd/`
(`audit-node.mjs`, `node-out.txt`, `lab.js`, `out_lab*.txt`, `init.js`, screenshots `quest-5.png`, `steps10.png`, `hint10.png`, `l2-14.png`, `settings-8.png`).
