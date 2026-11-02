## Enemy.spawned

**Read after `5.8.14 Reading: One value shared by every instance`.**

**Goal:** one counter that no single enemy owns, written from inside the constructor and read from the scene.

## Step 1: The counter that belongs to the class

```js live
class Enemy {
  static spawned = 0;      // declared once, on the class

  constructor(x, y) {
    this.hp = 4;
    this.sprite = new Sprite(x, y, 34, 34);
    this.sprite.color = 'red';
    this.sprite.text = String(this.hp);
    Enemy.spawned += 1;    // by the time you hold an enemy, it has been counted
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
    this.sprite.text = String(this.hp);
  }

  isAlive() {
    return this.hp > 0;
  }
}

let enemies = [];

function setup() {
  new Canvas(480, 260);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('ever spawned: ' + Enemy.spawned, 20, 28);
  text('still here:   ' + enemies.length, 20, 52);
  text('click to spawn one', 20, 240);

  if (mouse.presses()) enemies.push(new Enemy(mouse.x, mouse.y));
  if (kb.presses('space') && enemies.length > 0) enemies[0].takeHit(1);

  enemies = enemies.filter((e) => e.isAlive());

  for (const e of enemies) e.sprite.color = e.isAlive() ? 'red' : '#555';
}
```

**What you'll see:** click five times and "ever spawned" reads 5. Knock them down with Space and "still here" falls back to 0 — but "ever spawned" stays at 5, and then goes to 6 with the next click. The two numbers are answering different questions, which is exactly why they live in different places. One is a fact about the class's history; the other is a fact about the array.

## Step 2: Why the increment sits in the constructor

Put `Enemy.spawned += 1;` anywhere that creates an enemy, and it only counts *that* place. Put it in the constructor and it counts every enemy, including ones created by code you have not written yet. That is the same argument as `takeHit`: the rule goes where the event happens.

Note the order — the counter goes up **last** in the constructor. It does not matter here, but the habit is worth having: once the object exists, it has been counted.

## Step 3: Reset it, carefully

Add `Enemy.spawned = 0;` to `draw()` and run it. The number snaps back to 0 every frame and then climbs to 1 — because the assignment runs sixty times a second, right before the frame's new enemy. Delete the line.

The lesson is not that resets are wrong; it is that a class property has no owner watching it. Any line in the program can write it, at any moment. Give a class property a single place that resets it, or you will spend an afternoon finding out which line did.

## Key takeaways

- `static spawned = 0;` is declared in the class body, above the constructor.
- Write it as `Enemy.spawned`. `this.spawned` and `e.spawned` are a different (usually empty) property on the instance.
- Incrementing from the constructor counts every instance, wherever it was created.
- A class property is one number for the whole program — powerful, and equally easy to forget about.
