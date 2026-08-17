# Parallel arrays vs classes

Read this before `5.3.29 Worked Example — Procedural vs OOP side-by-side`. About 6 minutes.

By the end of this reading you should be able to answer:

- What is a "parallel array" data layout, and what bug does it invite?
- Why does deletion get harder as you add more arrays?
- How does packing data + behavior into a class change the same problem?

Both versions below build the *same* thing — a list of enemies, each with HP. The first does it the old procedural way (separate arrays for each property). The second uses a class. Read them side by side.

---

## Procedural — three arrays sharing an index

In the procedural version, "enemy 0" doesn't exist as a single object. It's *implied* by the agreement that index `0` of every array refers to the same enemy:

```js
let enemyX  = [];
let enemyY  = [];
let enemyHP = [];
```

Enemy `0`'s position is `(enemyX[0], enemyY[0])`, its HP is `enemyHP[0]`. Three arrays, one logical record.

**The fragility:** if you ever update one array but not the others, the indices fall out of sync. Enemy 0's position is now stuck on what *used* to be enemy 1. Every operation has to remember to update *every* array in lockstep.

```js live
let enemyX = [];
let enemyY = [];
let enemyHP = [];

function spawnEnemy(x, y, hp) {
  enemyX.push(x); enemyY.push(y); enemyHP.push(hp);
}

function damageEnemy(i, n) {
  enemyHP[i] -= n;
  if (enemyHP[i] <= 0) {
    enemyX.splice(i, 1); enemyY.splice(i, 1); enemyHP.splice(i, 1);
  }
}

function setup() {
  new Canvas(360, 240);
  spawnEnemy(90, 120, 3);
  spawnEnemy(180, 120, 2);
  spawnEnemy(270, 120, 1);
}

function draw() {
  background('#222');
  for (let i = 0; i < enemyX.length; i++) {
    fill('red');
    circle(enemyX[i], enemyY[i], 30);
    fill('white');
    textSize(12);
    text('HP ' + enemyHP[i], enemyX[i] - 15, enemyY[i] + 4);
  }
  if (mouse.presses()) spawnEnemy(mouse.x, mouse.y, 3);
  if (kb.presses('space') && enemyX.length) damageEnemy(0, 1);
}
```

**What you'll see:** three red circles in a row, each labelled with HP. Click anywhere to spawn another. Tap space to deal one damage to enemy `0`.

**Try this:** delete one of the three `splice` calls inside `damageEnemy` — say, the `enemyX.splice(...)` line. Then keep tapping space until enemy 0 should die. The circle still shows up but at a different position than its label, because the arrays fell out of sync.

**Now imagine adding a property** — say, a `color` per enemy. You'd need a new `enemyColor` array, plus updates in `spawnEnemy`, `damageEnemy`, and anywhere else that touches enemy data. One conceptual change, four code changes.

---

## Object-oriented — one array of `Enemy` instances

The OOP version makes "enemy 0" a real object. It owns its own position, HP, and behavior:

```js live
let enemies = [];

class Enemy {
  constructor(x, y, hp) {
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.color = 'red';
    this.hp = hp;
  }

  damage(n) {
    this.hp -= n;
    if (this.hp <= 0) {
      this.sprite.delete();
      enemies.splice(enemies.indexOf(this), 1);
    }
  }
}

function spawnEnemy(x, y, hp) {
  enemies.push(new Enemy(x, y, hp));
}

function setup() {
  new Canvas(360, 240);
  spawnEnemy(90, 120, 3);
  spawnEnemy(180, 120, 2);
  spawnEnemy(270, 120, 1);
}

function draw() {
  background('#222');
  for (let e of enemies) {
    fill('white');
    textSize(12);
    text('HP ' + e.hp, e.sprite.pos.x - 15, e.sprite.pos.y + 4);
  }
  if (mouse.presses()) spawnEnemy(mouse.x, mouse.y, 3);
  if (kb.presses('space') && enemies.length) enemies[0].damage(1);
}
```

**What you'll see:** the same gameplay — three red sprites, click to spawn, space to damage enemy 0. The behavior is identical; the *code shape* is what's different.

**Try this:** add a property. Inside the `Enemy` constructor, add `this.maxHp = hp;` (so each enemy remembers its starting HP). Then change the label to read `'HP ' + e.hp + '/' + e.maxHp`. Notice you only edited two places — the constructor and the draw call — instead of needing to update a parallel `enemyMaxHp` array everywhere.

---

## What changed

| Concern | Procedural | OOP |
|---------|-----------|-----|
| One enemy's data | Spread across N arrays at index `i` | Packed into one object |
| Deleting one | `splice` once per array | One `splice` on the array of objects |
| Adding a property | New array + updates everywhere | New line in the constructor |
| Behavior (`damage`) | Free-floating function that takes an index | Method on the object that owns the data |

**Behavior + data live together** in the OOP version. That's the central idea, and it's why classes scale better than parallel arrays the moment you have more than one or two properties per record.

---

## Quick reference

| Term | Meaning |
|------|---------|
| **Parallel arrays** | Several arrays representing one logical record by sharing an index. Fragile under deletion. |
| **`splice(i, 1)`** | Removes one element at index `i`, shifting later elements down. |
| **Class** | Blueprint for an object: constructor + methods. |
| **Instance** | A specific object built from a class with `new`. |
| **Method** | A function defined inside a class body. Has access to `this`. |

---

Once you can describe what goes wrong if one of the three `splice` calls is forgotten, open `5.3.29 Worked Example — Procedural vs OOP side-by-side`.
