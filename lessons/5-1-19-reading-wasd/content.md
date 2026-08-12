## WASD-not-arrows

Read before `2.1.8 Worked Example — Keyboard Movement`. About 5 minutes.

By the end of this reading you should be able to answer:

- Why do arrow keys cause problems in the in-app editor?
- How do you swap arrow keys for WASD in the movement pattern?
- Are `'a'`/`'d'`/`'w'`/`'s'` and `'left'`/`'right'`/`'up'`/`'down'` interchangeable everywhere?

The movement pattern you've been practicing works with any key names `kb.pressing` accepts. This reading explains the one rule you follow for **graded labs**: use WASD, not the arrow keys.

**What you'll learn from it:**

- In some browsers, the arrow keys also scroll the page or the editor's iframe while you're playing.
- That makes the canvas jump around while you try to control your sprite — a bad experience during graded work.
- WASD (`'a'`, `'d'`, `'w'`, `'s'`) does not trigger browser scroll, so the canvas stays put.
- The movement pattern is identical — only the key name strings change.

**Try it:**

```js live
let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 40, 40);
  player.color = 'mediumseagreen';
}

function draw() {
  background('#222');

  if      (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x =  4;
  else                       player.vel.x =  0;

  if      (kb.pressing('w')) player.vel.y = -4;
  else if (kb.pressing('s')) player.vel.y =  4;
  else                       player.vel.y =  0;
}
```

**What you'll see:** the same 4-direction movement you practiced before. Click the preview area to focus it, then use A/D/W/S to move. The page does not scroll.

**Try this:** replace `'a'` with `'left'` and `'d'` with `'right'`. Run it and try to use the arrow keys. Notice the page or editor frame may scroll. Switch back to WASD.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **WASD** | The four letter keys used for movement in graded labs: `'a'` (left), `'d'` (right), `'w'` (up), `'s'` (down). |
| **iframe scroll conflict** | Arrow keys scroll the browser page or embedded iframe in addition to triggering `kb.pressing`, disrupting canvas interaction. |
| **Key name string** | The argument passed to `kb.pressing()` — e.g. `'a'`, `'space'`, `'left'`. Case-sensitive; use lowercase. |
