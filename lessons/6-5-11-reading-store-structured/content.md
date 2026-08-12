## The full round-trip — save, reload, restore

**Read before the 2.5.11 worked example.** About 5 minutes.

By the end of this reading you should be able to answer:

- What are the four steps of a complete save/load round-trip?
- Why do numbers need `Number()` after `JSON.parse`?
- Where does the save-check go in your program?

You've seen `stringify` + `storeItem` (save) and `getItem` + `parse` (load) separately. Now put them together into one program.

**What you'll learn from it:**

- Before anything else, check if a save exists in `setup()`.
- Build your save object with every value your game needs to remember.
- After `JSON.parse`, numeric fields come back as numbers — but always coerce them with `Number()` to be safe when combining with user input or new defaults.

**Try it:**

```js live
let score, level, playerX, playerY;

function setup() {
  new Canvas(400, 300);

  let raw = getItem('gameSave');
  if (raw !== null) {
    let state = JSON.parse(raw);
    score = Number(state.score) || 0;
    level = Number(state.level) || 1;
    playerX = Number(state.playerX) || 200;
    playerY = Number(state.playerY) || 200;
    console.log('save loaded');
  } else {
    score = 0;
    level = 1;
    playerX = 200;
    playerY = 200;
    console.log('no save — using defaults');
  }
}

function draw() {
  background('#222');

  if (kb.pressed('s')) {
    let saveObj = {
      score: score,
      level: level,
      playerX: playerX,
      playerY: playerY
    };
    storeItem('gameSave', JSON.stringify(saveObj));
    console.log('game saved');
  }

  if (kb.pressed('space')) {
    score = score + 10;
  }

  fill('white');
  textSize(18);
  text('score: ' + score, 20, 60);
  text('level: ' + level, 20, 85);
  text('player: (' + playerX + ', ' + playerY + ')', 20, 110);

  fill('#888');
  textSize(14);
  text('Press SPACE to gain points', 20, 160);
  text('Press S to save', 20, 180);
  text('Refresh the page, then see if your save returns', 20, 200);
}
```

**What you'll see:** press Space a few times to build up a score, then press S to save. Refresh the page — your score is back.

That is the full round-trip. Build an object, stringify, store. Later: getItem, parse, coerce, restore.

**Why coerce after parse?** `JSON.stringify` preserves that `42` was a number. `JSON.parse` restores it as a number. But if you're building a save object that mixes parsed values with new ones (like adding 1 to a score), always `Number()` the parsed field. It costs you nothing and protects against a stray string sneaking in.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Round-trip** | The full cycle: save an object, then later load and restore it. |
| **Save object** | A plain JS object containing every piece of state you want to persist — scores, positions, levels, flags. |
