---
theme: default
title: "Unit 2.5 — State and Persistence"
info: |
  Unit 2.5: State and Persistence.
  Week 16 · Q2 · 2 class sessions.
  Covers: storeItem/getItem, JSON, save/loadJSON/preload, state machines.
class: text-center
transition: slide-left
mdc: true
---

# Unit 2.5 — State and Persistence

**Week 16 · Quarter 2 · Two sessions**

Your game just learned to remember.

<div class="text-sm opacity-70 mt-8">
Press <kbd>Space</kbd> or <kbd>→</kbd> to advance · <kbd>e</kbd> to open slide notes
</div>

---

# What you already know (W10–W15)

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## Sketches that draw + move

- `Canvas`, `Sprite`, `kb.pressing`
- `world.gravity`, collisions, groups
- `addAni`, `changeAni`, camera follow

</div>
<div>

## What's missing

- Reload the page → game forgets everything.
- Game-over screen? There isn't one.

</div>
</div>

<v-click>

This week: **save data between sessions** and **structure the game with named states**.

</v-click>

---

# Two big ideas this week

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## 1. Persistence

`storeItem` / `getItem` + JSON. Without these, every reload is a fresh start.

</div>
<div>

## 2. State machines

A `gameState` variable + `switch` in `draw()`. Without these, there's no flow — just one endless gameplay loop.

</div>
</div>

<v-click>

By Friday, your W15 game will: **remember a high score** + **boot into a menu, play, win/lose flow**.

</v-click>

---

# Persistence — what it is

The browser gives every site **~5 MB of localStorage** — a tiny key/value store that survives reloads, tab close, browser restart.

```js
storeItem('lastLevel', 3);   // write a key/value
let n = getItem('lastLevel'); // read it back
```

Close the tab. Open it tomorrow. **The key is still there.**

<v-click>

Inspect what your sketches save: open DevTools → **Application → Local Storage**.

</v-click>

<div class="text-xs opacity-60 mt-4">Lessons: <code>2.5.3 Reading — storeItem and getItem</code></div>

---

# `storeItem(name, value)`

Write a single key/value pair. The browser keeps it.

```js
function setup() {
  new Canvas(400, 400);
  storeItem('playerName', 'Ada');
  storeItem('lastScore', 42);
}
```

<v-click>

Each `name` is a unique slot. Re-storing the same `name` **overwrites**.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.3 Reading — storeItem and getItem</code></div>

---

# `getItem(name)`

Read a key back. **Returns the saved value… as a string.**

```js
console.log(getItem('lastScore'));  // "42" — note the quotes
```

<v-click>

That string-return is about to bite us.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.3 Reading — storeItem and getItem</code></div>

---

# The string-return bug

```js
storeItem('score', 10);
let s = getItem('score');
console.log(s + 1);   // ?
```

<v-click>

Output: **`"101"`**, not `11`.

</v-click>

<v-click>

When `+` sees a string, it concatenates. JS doesn't auto-fix this for you.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.3a Reading — getItem returns a string</code></div>

---

# The fix — `Number(...)`

```js
let s = Number(getItem('score'));
console.log(s + 1);   // 11
```

<v-click>

`Number(...)` (or `parseInt(...)`) coerces the string back to a number. **Always wrap numeric reads.**

</v-click>

```js
// idiomatic pattern for "read a number, default to 0"
let highScore = Number(getItem('highScore')) || 0;
```

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.3a Reading — getItem returns a string</code></div>

---

# Cleanup — `removeItem` and `clearStorage`

```js
removeItem('lastScore');   // delete one key
clearStorage();            // wipe everything this site has stored
```

<v-click>

Useful for "Reset progress" buttons. Required for `A16.1` so students can demo persistence + reset live.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.3b Reading — removeItem and clearStorage</code></div>

---

# Worked Example — High Score

```js
let score, highScore;

function setup() {
  new Canvas(400, 400);
  score = 0;
  highScore = Number(getItem('highScore')) || 0;
}

function draw() {
  background('#222');
  text(`Score: ${score}`, 10, 20);
  text(`Best: ${highScore}`, 10, 40);
  if (score > highScore) {
    highScore = score;
    storeItem('highScore', highScore);
  }
}
```

<div class="text-xs opacity-60 mt-2">Lesson: <code>2.5.4 Worked Example — High Score with storeItem</code></div>

---

# JSON — what it is

**JSON = JavaScript Object Notation.** A text format that looks like JS object literals but lives in a string.

```js
// in-memory object
let player = { name: 'Ada', score: 42 };

// as JSON
'{"name":"Ada","score":42}'
```

<v-click>

The trip between them is **stringify** (object → string) and **parse** (string → object).

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.6 / 2.5.7 — JSON readings</code></div>

---

# `JSON.stringify(obj)`

```js
let player = { name: 'Ada', score: 42 };
console.log(JSON.stringify(player));
//  → '{"name":"Ada","score":42}'
```

<v-click>

- Numbers, strings, booleans, arrays, nested objects: ✅ serialize.
- Functions, `undefined`: ❌ silently dropped.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.6 Reading — JSON.stringify</code></div>

---

# `JSON.parse(str)`

```js
let s = '{"name":"Ada","score":42}';
let p = JSON.parse(s);
console.log(p.score);   // 42
```

<v-click>

- Inverse of `stringify`.
- Malformed strings throw `SyntaxError` — wrap in `try/catch` if the source is untrusted.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.7 Reading — JSON.parse</code></div>

---

# Round-trip — store structured data

localStorage only stores strings. Anything more structured needs **stringify → store → get → parse**.

```js
// write
let scores = [9, 7, 5];
storeItem('top3', JSON.stringify(scores));

// read
let saved = JSON.parse(getItem('top3'));
console.log(saved[0]);   // 9
```

<v-click>

Forget the parse and `obj.score` is `undefined` — you're holding a string that *looks like* an object.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.8 Reading — Storing structured data</code></div>

---

# Exporting — `save(obj, 'file.json')`

```js
let level = {
  name: "Level 1",
  platforms: [{ x: 100, y: 300, w: 200, h: 20 }]
};

if (kb.presses('e')) save(level, 'level1.json');   // triggers download
```

<v-click>

Useful for **level editors** — students who want to ship hand-crafted levels can export them and check them into git.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.9 Worked Example — Export Level as JSON</code></div>

---

# `loadJSON` is async — `preload()`

`loadJSON(url)` fetches over the network. **The result isn't ready immediately.**

```js
let levelData;

function preload() {
  levelData = loadJSON('level1.json');   // fetches before setup()
}

function setup() {
  console.log(levelData.name);   // ready, because preload finished
}
```

<v-click>

**Move `loadJSON` into `setup` and the bug fires:** `levelData.name` is `undefined`, because `setup` runs before the fetch returns.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.10 Reading — loadJSON is async</code></div>

---

# A16.1 preview — Persistent High Scores

Bolt persistent top-3 scores onto your W15 game.

**Pass criteria (all must be green):**

- Reads saved high scores in `setup()`.
- Stores them as JSON (`stringify` + `storeItem`).
- Coerces stored values back to numbers (`Number(getItem(...))`).
- Writes a new entry only when the score qualifies.
- Clear button wipes saved scores (`clearStorage` or `removeItem`).
- `background(...)` cleared every frame.

<v-click>

**Persistence proof:** close the tab, reopen, the top 3 are still there.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.12 A16.1 Persistent High Scores</code></div>

---

# State machines — why

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## Without states

```js
function draw() {
  // every frame, all the time
  movePlayer();
  spawnEnemies();
  drawScore();
}
```

No menu, no pause, no win.

</div>
<div>

## With states

```js
function draw() {
  switch (gameState) {
    case 'menu': drawMenu(); break;
    case 'play': playFrame(); break;
    case 'win':  drawWin();  break;
  }
}
```

One variable drives everything.

</div>
</div>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.13 Video — State machines in games</code></div>

---

# The state variable

```js
let gameState = 'menu';   // single source of truth
```

<v-click>

- A regular `let` whose value is a short string label.
- Conventionally named `gameState`.
- Only this variable decides what `draw()` runs.

</v-click>

<v-click>

Why not boolean flags (`isPlaying`, `isPaused`, `isWon`)?

**Because impossible combinations** (`isPlaying && isPaused`) become unrepresentable when there's only one variable.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.14 Reading — The state variable</code></div>

---

# `switch` syntax

```js
switch (mood) {
  case 'happy':
    console.log('🙂');
    break;
  case 'sad':
    console.log('😞');
    break;
  default:
    console.log('?');
}
```

<v-click>

- `case` matches with strict equality (`===`).
- **Forget `break`?** Execution falls through into the next case — sometimes intentional, usually a bug.
- `default:` runs when no case matches.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.15 Reading — The switch statement</code></div>

---

# `switch (gameState)` in `draw()`

```js
function draw() {
  background('#222');

  switch (gameState) {
    case 'menu':
      text('Press SPACE to start', 100, 200);
      break;

    case 'play':
      // game logic here
      break;
  }
}
```

<v-click>

**Each case owns its frame logic.** Render + input handling for one state lives in one block.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.16 Reading — switch in draw()</code></div>

---

# Worked Example — Three-state machine

```js
let gameState = 'menu', score = 0;

function draw() {
  background('#222');
  switch (gameState) {
    case 'menu':
      text('Press SPACE to start', 100, 200);
      if (kb.presses(' ')) gameState = 'play';
      break;
    case 'play':
      score++;
      text(`Score: ${score}`, 10, 20);
      if (score >= 60) gameState = 'win';
      break;
    case 'win':
      text('YOU WIN — press R to restart', 80, 200);
      if (kb.presses('r')) { score = 0; gameState = 'menu'; }
      break;
  }
}
```

<div class="text-xs opacity-60 mt-2">Lesson: <code>2.5.17 Worked Example — Three-state machine</code></div>

---

# Input-driven transitions

```js
case 'menu':
  text('Press SPACE to start', 100, 200);
  if (kb.presses(' ')) gameState = 'play';
  break;
```

<v-click>

- Use `kb.presses` (one-shot), not `kb.pressing` (held) — otherwise the state flips every frame the key is held.
- Transitions live **inside the case whose state owns them.**

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.18 Reading — Input-driven transitions</code></div>

---

# Condition-driven transitions

```js
case 'play':
  score++;
  if (score >= 10) gameState = 'win';   // outcome → state
  if (lives === 0) gameState = 'lose';
  break;
```

<v-click>

**Watch out for re-firing.** Once `score >= 10`, the next frame is *also* `>= 10`. Either guard the transition, or rely on the new case not testing the same condition.

</v-click>

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.19 Reading — Condition-driven transitions</code></div>

---

# A16.2 preview — Game States

Add a state machine to your game with at least 3 states.

**Pass criteria (all must be green):**

- Declares a `gameState` variable.
- Drives `draw()` with `switch (gameState)`.
- Implements at least 3 named cases.
- Has an input-driven transition (menu → play).
- Has a condition-driven end transition (play → win/lose).
- Has a return-to-menu transition.

<div class="text-xs opacity-60 mt-4">Lesson: <code>2.5.20 A16.2 Game States</code></div>

---

# Lesson map — Module 2.5

<div class="grid grid-cols-2 gap-6 text-sm mt-4">
<div>

**Session 1 — Save / Load**

- `2.5.1`  📊 Slides
- `2.5.2`  🎥 Video — Saving between sessions
- `2.5.3`  📖 Reading — storeItem / getItem
- `2.5.3a` 📖 Reading — getItem returns a string
- `2.5.3b` 📖 Reading — removeItem / clearStorage
- `2.5.4`  💡 Example — High Score
- `2.5.5`  🎥 Video — JSON
- `2.5.6`  📖 Reading — JSON.stringify
- `2.5.7`  📖 Reading — JSON.parse
- `2.5.8`  📖 Reading — Storing structured data
- `2.5.9`  💡 Example — Export Level as JSON
- `2.5.10` 📖 Reading — loadJSON is async
- `2.5.11` 💡 Example — Load JSON in preload
- `2.5.12` ✏️ A16.1 Persistent High Scores

</div>
<div>

**Session 2 — State Machines**

- `2.5.13` 🎥 Video — State machines
- `2.5.14` 📖 Reading — The state variable
- `2.5.15` 📖 Reading — The switch statement
- `2.5.16` 📖 Reading — switch in draw()
- `2.5.17` 💡 Example — Three-state machine
- `2.5.18` 📖 Reading — Input-driven transitions
- `2.5.19` 📖 Reading — Condition-driven transitions
- `2.5.20` ✏️ A16.2 Game States
- `2.5.21` ⭐ Challenges (optional)

</div>
</div>

---

# Quick reference — Vocabulary

<div class="grid grid-cols-3 gap-4 text-xs mt-2">
<div>

**Storage**

- **localStorage** — browser key/value store
- **`storeItem(name, val)`** — write
- **`getItem(name)`** — read (returns string!)
- **`Number(...)`** — coerce string→number
- **`removeItem`** — delete one key
- **`clearStorage`** — wipe all
- **Persistence** — survives reload

</div>
<div>

**JSON**

- **JSON** — text format for objects
- **`JSON.stringify`** — obj → string
- **`JSON.parse`** — string → obj
- **Round-trip** — stringify→store→get→parse
- **`save(obj, 'x.json')`** — file export
- **`loadJSON`** — async fetch (preload only)
- **`preload()`** — runs before setup, blocks on async loads

</div>
<div>

**State machines**

- **State** — current "what the game is doing" label
- **State variable** — `let gameState = '...'`
- **`switch`** — JS dispatch on a value
- **`case` / `break`** — labels + exit
- **State dispatch** — `switch (gameState)` in draw
- **Transition** — line that assigns a new state
- **Guard** — extra condition preventing re-fire

</div>
</div>

---

# What's next — Week 17

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## You can now

- Persist data across reloads
- Round-trip structured data via JSON
- Drive `draw()` with a `gameState` variable
- Compose 3+ states with input + condition transitions

</div>
<div>

## W17 — Joints + Advanced Input

- Connecting sprites with joints (revolute, distance, weld)
- Mouse input + drag-and-drop
- Setup for the W18 capstone

</div>
</div>

<v-click>

**Capstone (W18) requires:** persistent storage + multi-state flow. You leave this week with both.

</v-click>

---

# Wrap

**Big takeaways:**

- localStorage gives you ~5 MB of free persistence.
- `getItem` always returns a string — coerce numerics with `Number(...)`.
- `JSON.stringify` / `JSON.parse` round-trip structured data through storage.
- `loadJSON` is async — it must live in `preload()`.
- One `gameState` variable + `switch` in `draw()` is cleaner than scattered booleans.
- Transitions live inside the case whose state owns them.

<div class="text-sm opacity-70 mt-8">Questions? See you Wednesday.</div>
