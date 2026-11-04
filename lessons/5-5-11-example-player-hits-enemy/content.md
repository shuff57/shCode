## player.hit(enemy)

**Read after `7.3.10 Reading: A parameter that is another object`.**

**Goal:** move a decision from the scene into an object, by letting the player act on the enemy it is given.

## Step 1: The scene decides who hit whom

```js live
class Enemy {
  constructor(x, y) {
    this.hp = 6;
    this.sprite = new Sprite(x, y, 40, 40);
    this.sprite.color = 'red';
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
  }

  isAlive() {
    return this.hp > 0;
  }
}

let p, e;

function setup() {
  new Canvas(400, 240);
  p = new Sprite(120, 120, 36, 36);
  p.color = 'white';
  e = new Enemy(260, 120);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('enemy hp: ' + e.hp, 20, 215);
  text('press Space to hit the enemy', 20, 22);

  if (kb.presses('space')) e.takeHit(1);   // draw() knows what a hit means

  e.sprite.text = String(e.hp);
  e.sprite.color = e.isAlive() ? 'red' : '#555';
}
```

**What you'll see:** press Space and the enemy's number falls to 0, then it greys out. It works. The cost is the same as in 7.3.6: `draw()` is where a hit gets decided, so a second scene would have to decide it again.

## Step 2: The player decides

Add a `Player` class. Its `hit(other)` method does the one thing a player does to an enemy: it calls the enemy's own method. The scene stops knowing about `takeHit` entirely.

```js live
class Enemy {
  constructor(x, y) {
    this.hp = 6;
    this.sprite = new Sprite(x, y, 40, 40);
    this.sprite.color = 'red';
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
  }

  isAlive() {
    return this.hp > 0;
  }
}

class Player {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 36, 36);
    this.sprite.color = 'white';
    this.power = 2;
  }

  hit(other) {
    other.takeHit(this.power);
  }
}

let p, e;

function setup() {
  new Canvas(400, 240);
  p = new Player(120, 120);
  e = new Enemy(260, 120);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('enemy hp: ' + e.hp, 20, 215);
  text('press Space to hit the enemy', 20, 22);

  if (kb.presses('space')) p.hit(e);       // draw() knows who hits whom, not how

  e.sprite.text = String(e.hp);
  e.sprite.color = e.isAlive() ? 'red' : '#555';
}
```

**What you'll see:** exactly the same thing as Step 1. Press Space and the number falls in 2s: 4, 2, 0. Read the `hit` method closely:

```js
hit(other) {
  other.takeHit(this.power);
}
```

Three objects meet on one line. `this` is the player, so `this.power` is the player's own strength. `other` is the enemy. `other.takeHit(...)` asks the enemy to apply the hit, so the floor at zero and the death rule stay where they belong. Neither class has to know the other's properties.

## Step 3: Change the player, not the enemy

Set `this.power = 3;` in the `Player` constructor and run it again. The enemy now drops in 3s without a single line of `Enemy` changing. Then swap the call in `draw()` to `e.takeHit(1)` and notice that the two versions have stopped agreeing — which is the point: there is now one place that decides what "the player hits" means.

## Key takeaways

- `p.hit(e)` reads as one object acting on another; `p.hit(e)` and `e.hit(p)` are different sentences.
- Inside `hit(other)`, `this` is the receiver and `other` is the parameter. Both are real objects with their own properties.
- The receiver's data (`this.power`) and the argument's methods (`other.takeHit`) are both fair game — and nothing else is.
- Moving the call from `draw()` into a method took a rule out of the scene and gave it to the class that owns it.
