## One value shared by every instance

**Read before `5.8.15 Worked Example: Enemy.spawned`.** About 5 minutes.

By the end of this reading you should be able to answer:

- What is the difference between `this.count` and a `static` property?
- How do you read a class property, and why is `e.spawned` not it?
- When is one shared number the right design?

Every property you have written so far belonged to **one object**. Make three enemies and there are three separate `hp` values, three `sprites`, three of everything. That is usually what you want.

Sometimes you want one number that all of them share, and that outlives any of them: how many enemies have *ever* been built, what the high score is, which level everyone is on. A property declared `static` inside the class body belongs to the **class**, not to the instances.

| | Written as | Belongs to | Reached as |
| --- | --- | --- | --- |
| instance property | `this.hp = 10` in the constructor | one object | `e.hp` |
| static property | `static spawned = 0` in the class body | the class itself | `Enemy.spawned` |

**Try it:**

```js live
class Enemy {
  static spawned = 0;      // one counter for the whole class

  constructor(x, y) {
    this.sprite = new Sprite(x, y, 34, 34);
    this.sprite.color = 'red';
    Enemy.spawned += 1;    // every new enemy bumps the class's own number
  }
}

let e;

function setup() {
  new Canvas(400, 200);
  e = new Enemy(120, 100);
}

function draw() {
  background('#222');
  fill('white');
  textSize(15);
  text('Enemy.spawned = ' + Enemy.spawned, 20, 30);
  text('e.spawned     = ' + e.spawned, 20, 60);
  text('click to spawn another', 20, 175);
  if (mouse.presses()) new Enemy(mouse.x, mouse.y);
}
```

**What you'll see:** `Enemy.spawned` goes up by one per click. `e.spawned` prints `undefined` — and that is not a mistake. The first enemy is a *receiver* of the class's number, not an owner of it: the property is not on the object, it is on the class. Reaching for `e.spawned` is asking one soldier how many soldiers were ever recruited.

**Try this:** add `e.hp = 10;` to the constructor and print `e.hp` beside the others. It works, because `hp` is an instance property. Now print `Enemy.hp` — `undefined` again, for the mirror-image reason. The two kinds of property never mix; whichever side of the dot you write decides which one you are holding.

### The word collision to watch for

This course already uses the word **static** for something unrelated. In 5.2 you met `new Sprite(x, y, w, h, 'static')`, which is a **body type**: that sprite ignores gravity. That `'static'` is a string handed to a constructor. `static spawned = 0` is a keyword in the class body. Same word, two jobs, no connection. If a sprite in this module refuses to fall, check the body type before you check the class.

### When not to use it

A shared counter is easy to reach for and hard to reason about: every instance can change it, and after a few hours of play nobody knows which one did. Reach for `static` when the number is genuinely *about the class* — how many exist, how many were ever made, what the shared best score is. Anything that is true of *one* enemy stays on `this`.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **static property** | Declared with `static` in the class body; one copy for the class, reached as `ClassName.name` |
| **class variable** | Another name for a static property |
| **body type** | moSHion's `'static'` / `'dynamic'` argument: whether a sprite obeys gravity. Unrelated to `static` in a class |
| **instance property** | A property on `this`; one copy per object |
