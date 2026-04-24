## Procedural — parallel arrays
**Read before attempting `2.2.10 Example — Procedural vs OOP`.**

What you'll learn from it:
- How an "enemy" is represented implicitly by a shared index `i` across three separate arrays.
- Why adding a new property (e.g. `element`) forces a fourth array and another lockstep update everywhere it is used.
- Why a single delete takes three `splice` calls — and what breaks the moment one array falls out of sync.

**Try it:** click the canvas to spawn enemies. Press `space` to damage enemy `0` (watch three arrays stay in lockstep on delete).

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

## Object-oriented — array of instances
**Read before attempting `2.2.10 Example — Procedural vs OOP`.**

What you'll learn from it:
- How one class packs all of an enemy's data and behavior into a single object.
- Why deletion is one operation on `enemies`, not three in lockstep.
- How a method (`damage(n)`) keeps behavior next to the data it mutates.
- Why adding a property means editing one constructor, not four arrays.

**Try it:** same controls as above — click to spawn, `space` to damage enemy `0`. One object, one array, one delete.

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
      this.sprite.remove();
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

---

## Short glossary (quick reference)

| Term | Definition |
|------|-----------|
| **Class** | Blueprint describing what data an object holds and what it can do. |
| **Instance** | A specific object built from a class with `new`. Each instance has its own copy of the data. |
| **`constructor`** | Method that runs when `new` is called; stores initial values on `this`. |
| **Method** | A function defined inside a class body; available on every instance. |
| **Parallel arrays** | Several arrays representing one logical record by sharing an index. Fragile under deletion. |
| **`splice(i, 1)`** | Removes one element at index `i`, shifting the rest down. |
