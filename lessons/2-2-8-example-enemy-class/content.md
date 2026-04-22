# 2.2.8 Worked Example — Write an Enemy class

Now that you know `Sprite` is a class, you're going to write one of your own. The `Enemy` class below wraps a q5play sprite, stores hit points, and knows how to take damage and despawn itself. Type it line-by-line into the in-app editor — the goal is to feel every `this.` as you go.

---

## Worked Example — Build `Enemy` one method at a time

**Goal:** Write your first class from scratch. Prove the constructor creates per-instance state and that methods can reach that state via `this`.

### Step 1 — Stub the class and instantiate it

```js live
class Enemy {
  constructor(x, y, hp) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.color = 'red';
  }
}

let enemy;

function setup() {
  new Canvas(400, 400);
  enemy = new Enemy(200, 200, 10);
}

function draw() {
  background('#222');
}
```

Run it. A red square appears at the center. You just wrote a class. `new Enemy(200, 200, 10)` called your constructor, which (1) stored three arguments on `this` and (2) created a q5play sprite and stored *that* on `this` too. Every property you set on `this` becomes part of the returned instance.

### Step 2 — Add a method that mutates `this`

Drop this between the closing `}` of `constructor` and the closing `}` of `Enemy`:

```js
  damage(n) {
    this.hp -= n;
    if (this.hp <= 0) {
      this.sprite.remove();
    }
  }
```

Nothing happens yet — nothing calls `damage()`. Methods don't run until you ask them to. We'll wire input next.

### Step 3 — Wire input to the method

Replace `draw()` with:

```js
function draw() {
  background('#222');
  if (kb.presses('space')) enemy.damage(1);
}
```

Run. Press **space** 10 times. On the tenth press the enemy disappears. `enemy.damage(1)` calls the method with `this = enemy`, so `this.hp -= n` mutates *this particular* enemy's hit points. At 0 the enemy tells *its own sprite* to despawn. No external bookkeeping — the behavior lives inside the object that owns the data.

### Step 4 — Add a `render()` method for feedback

Inside the class, after `damage()`:

```js
  render() {
    this.sprite.text = String(this.hp);
  }
```

Then call it every frame, before the input check:

```js
function draw() {
  background('#222');
  enemy.render();
  if (kb.presses('space')) enemy.damage(1);
}
```

Now the remaining hit points are drawn on the sprite. Press space and watch 10 → 9 → 8 → … → 0 → gone.

**Try the combined final — press space to damage:**

```js live
class Enemy {
  constructor(x, y, hp) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.color = 'red';
  }

  damage(n) {
    this.hp -= n;
    if (this.hp <= 0) {
      this.sprite.remove();
    }
  }

  render() {
    this.sprite.text = String(this.hp);
  }
}

let enemy;

function setup() {
  new Canvas(400, 400);
  enemy = new Enemy(200, 200, 10);
}

function draw() {
  background('#222');
  enemy.render();
  if (kb.presses('space')) enemy.damage(1);
}
```

### Key takeaways

- **`this.x = x`** — the constructor stores arguments on the *instance*. If you create `enemy2 = new Enemy(100, 100, 5)`, that instance gets its own `this.x = 100`. Neither enemy knows about the other's `x`.
- **`this.sprite = new Sprite(...)`** — each `Enemy` owns exactly one q5play sprite. Storing it on `this` means every method in the class can reach it.
- **`this` inside a method** — refers to whichever instance the method was called on. `enemy.damage(1)` sets `this` to `enemy`; `enemy2.damage(3)` would set `this` to `enemy2`. One method definition, works for every instance.
- **`this.sprite.remove()`** — the object cleans up after itself. Behavior lives next to the data it mutates.
