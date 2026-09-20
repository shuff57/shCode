## Cleanup and Delete

**Read before `5.2.11 Lab: Reaching the Goal`.**

**What you'll learn from it:**

- `sprite.delete()` permanently removes a sprite: drawing, updating, and its physics body are all gone, with no undo.
- `.visible = false` only hides a sprite; everything else, including physics and collisions, keeps running.

**Try it:**

```js live
let a, b;

function setup() {
  new Canvas(360, 200);
  a = new Sprite(120, 100, 40, 40);
  a.color = 'deepskyblue';
  b = new Sprite(240, 100, 40, 40);
  b.color = 'orange';
}

function draw() {
  background('#222');
  if (kb.presses('d') && a) {
    a.delete();
    a = null;
    console.log('a deleted');
  }
  if (kb.presses('v')) {
    b.visible = !b.visible;
    console.log('b visible:', b.visible);
  }
}
```

Press **d**: the blue sprite vanishes for good, and pressing **d** again logs nothing more, since `a` is now `null`. Press **v** repeatedly instead: the orange sprite toggles hidden and visible, but it never actually leaves the scene.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| delete() | Permanently removes a sprite; no undo; contrast with `.visible = false` |
