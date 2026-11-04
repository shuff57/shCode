## The wave spawner

**Read after `7.3.16 Lab: Count your spawns`.**

**Goal:** assemble the whole module — a class that holds its own rules, a list of instances, and a spawner that makes new ones while the sketch runs.

## Step 1: A timer that makes enemies

`frameCount` (5.2.1) already counts frames for you. `frameCount % 90 === 0` is true on frame 90, 180, 270 — once every one and a half seconds.

```js live
class Enemy {
  static spawned = 0;

  constructor(x, y) {
    this.hp = 3;
    this.sprite = new Sprite(x, y, 34, 34);
    this.sprite.color = 'red';
    this.sprite.text = String(this.hp);
    Enemy.spawned += 1;
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
    this.sprite.text = this.isAlive() ? String(this.hp) : '';
  }

  isAlive() {
    return this.hp > 0;
  }
}

let enemies = [];

function setup() {
  new Canvas(520, 300);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('ever spawned: ' + Enemy.spawned, 20, 28);
  text('still here:   ' + enemies.length, 20, 52);
  text('Space hits the first   ·   click anywhere', 20, 285);

  if (frameCount % 90 === 0) {
    enemies.push(new Enemy(260, 150));
  }

  if (kb.presses('space') && enemies.length > 0) enemies[0].takeHit(1);
  if (mouse.presses()) enemies.push(new Enemy(mouse.x, mouse.y));

  enemies = enemies.filter((e) => e.isAlive());
  for (const e of enemies) e.sprite.color = '#e04a4a';
}
```

**What you'll see:** an enemy appears in the middle every 90 frames, whether or not you are doing anything. "ever spawned" climbs on its own; "still here" only falls when you hit them. Nothing in this loop is new — a timer, a `push`, a `filter`, and a `static` counter.

**Why `% 90` and not `=== 90`:** `frameCount === 90` is true for exactly one frame in the whole run. The modulo makes the condition come back around.

## Step 2: A wave is a burst, not a drip

Right now the spawner is a conveyor belt: one enemy at a time, forever, faster on screen than you can clear. A **wave** is a group that arrives together and is cleared before the next group comes.

```js live
class Enemy {
  static spawned = 0;

  constructor(x, y) {
    this.hp = 3;
    this.sprite = new Sprite(x, y, 34, 34);
    this.sprite.color = 'red';
    this.sprite.text = String(this.hp);
    Enemy.spawned += 1;
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
    this.sprite.text = this.isAlive() ? String(this.hp) : '';
  }

  isAlive() {
    return this.hp > 0;
  }
}

let enemies = [];

function setup() {
  new Canvas(520, 300);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('ever spawned: ' + Enemy.spawned, 20, 28);
  text('still here:   ' + enemies.length, 20, 52);
  text('Space hits the first', 20, 285);

  // A new wave only when the field is clear.
  if (enemies.length === 0 && frameCount % 90 === 0) {
    enemies.push(new Enemy(90, 100));
    enemies.push(new Enemy(260, 100));
    enemies.push(new Enemy(430, 100));
  }

  if (kb.presses('space') && enemies.length > 0) enemies[0].takeHit(1);

  enemies = enemies.filter((e) => e.isAlive());
  for (const e of enemies) e.sprite.color = '#e04a4a';
}
```

**What you'll see:** three enemies arrive together. Nothing new appears until you have cleared all three; then, on the next multiple of 90, the next three arrive. The `enemies.length === 0` half of the condition is doing the real work — without it, three more would pile in every 90 frames whether you were ready or not.

## Step 3: Read the whole thing as a system

Four things are now working together, and each one lives where it belongs:

| Job | Where it lives | Why there |
| --- | --- | --- |
| what a hit does, when an enemy dies | `Enemy.takeHit`, `Enemy.isAlive` | the class owns the rule for its own health |
| how many enemies have ever existed | `Enemy.spawned` | a fact about the class, not about one enemy |
| which enemies are on the field | `enemies` | the scene owns the collection |
| when the next group arrives | `draw()`'s timer | a fact about this level's pacing |

That table is the design question this module has been circling. Every time you add a number or a rule, ask which row it belongs to. Moving it to the wrong row is how a game ends up where nobody can tell you where the score comes from.

## Key takeaways

- `frameCount % n === 0` is a timer without a variable.
- `enemies.length === 0` is how a wave knows the last one is cleared.
- The constructor is the only place that sees *every* enemy created.
- A spawner is three familiar pieces: a class, an array, and a filter.
