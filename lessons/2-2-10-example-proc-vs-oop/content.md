**Goal:** Feel the difference between "data scattered across arrays" and "data bundled into instances" by running both versions yourself.

## Step 1 — Procedural with parallel arrays

Each piece of enemy data lives in its own array, indexed in parallel. Functions take an index `i` and reach into all four arrays at once. Press **space** to damage enemy 0, or **d** to delete it.

```js live
let enemyX = [];
let enemyY = [];
let enemyHP = [];
let sprites = [];

function setup() {
  new Canvas(400, 400);
  for (let i = 0; i < 3; i++) {
    spawnEnemy(100 + i * 100, 200, 5);
  }
}

function draw() {
  background('#222');
  for (let i = 0; i < enemyX.length; i++) {
    sprites[i].text = String(enemyHP[i]);
  }
  if (kb.presses('space')) damageEnemy(0, 1);
  if (kb.presses('d') && enemyX.length > 0) deleteEnemy(0);
}

function spawnEnemy(x, y, hp) {
  enemyX.push(x);
  enemyY.push(y);
  enemyHP.push(hp);
  const s = new Sprite(x, y, 30, 30);
  s.color = 'red';
  sprites.push(s);
}

function damageEnemy(i, n) {
  enemyHP[i] -= n;
  if (enemyHP[i] <= 0) deleteEnemy(i);
}

function deleteEnemy(i) {
  enemyX.splice(i, 1);
  enemyY.splice(i, 1);
  enemyHP.splice(i, 1);
  sprites[i].delete();
  sprites.splice(i, 1);
}
```

Look at `deleteEnemy`. Four arrays, four `splice`/`delete` calls — all aligned by index. Forget one and the arrays fall out of sync forever: `enemyX[0]` would refer to a different enemy than `enemyHP[0]`.

## Step 2 — OOP with an array of instances

All the data and behavior live inside the `Enemy` class. The outside world works with a single array of objects. Same controls: **space** to damage enemy 0, **d** to delete it.

```js live
let enemies = [];

class Enemy {
  constructor(x, y, hp) {
    this.hp = hp;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.color = 'red';
  }

  damage(n) {
    this.hp -= n;
    if (this.hp <= 0) this.despawn();
  }

  despawn() {
    this.sprite.delete();
    enemies.splice(enemies.indexOf(this), 1);
  }

  render() {
    this.sprite.text = String(this.hp);
  }
}

function setup() {
  new Canvas(400, 400);
  for (let i = 0; i < 3; i++) {
    enemies.push(new Enemy(100 + i * 100, 200, 5));
  }
}

function draw() {
  background('#222');
  for (const e of enemies) e.render();
  if (kb.presses('space') && enemies[0]) enemies[0].damage(1);
  if (kb.presses('d') && enemies[0]) enemies[0].despawn();
}
```

Same behavior. One array instead of four. Each enemy carries its own data, so deletion is one local method — nothing outside the class can forget to update a "parallel" piece of state, because there isn't any.

## Step 3 — Which would you rather extend?

Think through these before your A12.2 written reflection — no answer key:

1. You want to add an `element` property to each enemy (fire, ice, lightning). In Step 1, how many arrays do you touch? In Step 2, how many lines inside the class do you touch?
2. In Step 1, deleting enemy at index 3 means four aligned operations. What happens if you forget one? In Step 2, what is the equivalent operation?
3. A new teammate reads your code for the first time. Which version makes it clearer that `x`, `y`, `hp`, and `damage` all belong to the *same thing*?

## Key takeaways

- **Procedural** keeps data in separate arrays indexed in parallel. Simple for tiny programs, fragile once you add more fields or start deleting mid-array.
- **OOP** bundles data and the functions that act on it into one object. Adding a property or behavior is a local change — you don't hunt across four arrays.
- Both approaches run the same simulation. OOP isn't "faster." It's a different way to organize the same code so it's easier to change later.
