## The number anyone can set

**Read after `7.3.5 Reading: Who may change a property`.**

**Goal:** watch the same enemy class fail and then hold its rule, with the arithmetic moving from the scene into the class.

## Step 1: The scene does the bookkeeping

```js live
class Enemy {
  constructor(x, y) {
    this.hp = 10;
    this.sprite = new Sprite(x, y, 40, 40);
    this.sprite.color = 'red';
  }
}

let e;

function setup() {
  new Canvas(360, 200);
  e = new Enemy(180, 100);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('hp: ' + e.hp, 20, 175);
  text('press Space to hit for 4', 20, 22);
  if (kb.presses('space')) {
    e.hp = e.hp - 4;
    if (e.hp <= 0) e.sprite.delete();
  }
  e.sprite.text = String(e.hp);
}
```

**What you'll see:** three presses and the sprite is gone. It works — but count the rules `draw()` is now responsible for: how much a hit is worth, when health has run out, and what to do about it. Move that enemy into a second scene, or hand it to a classmate, and every one of those rules has to be written again, correctly, in the new place.

## Step 2: The class does the bookkeeping

Same enemy. The only things that changed are inside the class body: a `takeHit(n)` method and an `isAlive()` method.

```js live
class Enemy {
  constructor(x, y) {
    this.hp = 10;
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

  render() {
    this.sprite.text = String(this.hp);
  }
}

let e;

function setup() {
  new Canvas(360, 200);
  e = new Enemy(180, 100);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('hp: ' + e.hp, 20, 175);
  text('press Space to hit for 4', 20, 22);
  if (kb.presses('space')) e.takeHit(4);
  if (!e.isAlive()) e.sprite.delete();
  else e.render();
}
```

**What you'll see:** exactly the same three presses and the same disappearance. What changed is *who knows what*. The scene no longer knows how a hit is applied or what "dead" means; it asks. Health stops at 0 instead of sliding to `-2`, so the number on screen is always a number the class would stand behind.

Notice the two lines of the guard: `this.hp -= n;` then `if (this.hp < 0) this.hp = 0;`. Writing the guard *after* the subtraction is the version that is easy to get right, because it only has to ask about the state that now exists.

## Step 3: Try to break it from outside

Add `e.hp = -50;` to `draw()` in the second version and run it. The number goes to `-50` — the class cannot stop you, because the property is still open. Delete that line again.

That is the honest limit of this lesson: encapsulation in JavaScript is a **design decision**, not a wall. What the methods give you is one correct place to write the rule. Keeping the outside out of `.hp` is still your job, and it is the job of every method you write from here on.

## Key takeaways

- A rule written in `draw()` is written once per scene. A rule written in a method is written once per class.
- `takeHit(n)` is not just tidier — it is the only version that can promise "health never goes below 0", because it is the only place the subtraction happens.
- `isAlive()` gives the outside the answer it actually wanted, and stops every caller from re-inventing `hp > 0`.
- The property is still visible. Methods make the right thing easy; they do not make the wrong thing impossible.
