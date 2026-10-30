## Who may change a property?

**Read before `5.5.6 Worked Example: The number anyone can set`.** About 5 minutes.

By the end of this reading you should be able to answer:

- Who is allowed to write a property, once an object exists?
- What can go wrong when the code outside the class writes one?
- What does it mean to say the class owns its rule?

A property is **open**. Nothing in JavaScript stops any code holding an object from setting any of its properties:

```js
enemy.hp = -50;          // runs. No warning, no error.
enemy.hp = "lots";       // runs too. Now hp is a string.
enemy.constructor = 7;   // runs. This one is a genuinely bad idea.
```

5.4.21 (Reading: Encapsulation) named **encapsulation** as a word for exactly this: keeping an object's data and the rules about that data in the same place. This reading is the same idea, with a real failure you can watch.

**Try it:**

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
  textSize(14);
  text('hp: ' + e.hp, 20, 175);
  text('press Space to hit for 4', 20, 20);
  if (kb.presses('space')) e.hp = e.hp - 4;   // the scene does the bookkeeping
  e.sprite.text = String(e.hp);
}
```

**What you'll see:** press Space three times and `hp` reaches `-2`. The sprite is still on screen, red, and the number says `-2`. Nothing is broken in the sense a computer cares about — no error, no crash. The *enemy* is broken: it has less than no health, and every other part of the program has to know that `-2` really means "already dead".

**Try this:** change the last line to `e.sprite.text = e.hp > 0 ? String(e.hp) : 'down';` and press Space three times. Now the display is honest again — but the rule is still written *outside* the class, in `draw()`. That is the problem: if two scenes both use an `Enemy`, both must remember the rule, and one of them will forget.

**The alternative** is a method that owns the rule. Nobody outside says what a hit does; they say *"this enemy is hit"*, and the class decides.

- `e.takeHit(4)` — the class subtracts, and decides that health never goes below 0.
- `e.isAlive()` — the class answers the question the outside actually has, instead of making everyone compare `hp > 0` themselves.

The property is still there and still open, and nothing in this course will stop you writing `e.hp = -50`. The point is that a well-built class does not need you to.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **open property** | Reachable from anywhere that holds the object; JavaScript enforces no protection |
| **encapsulation** | Keeping data and the rules about that data together, inside the class (named in 5.4.21) |
| **method that owns a rule** | A method other code calls instead of doing the rule itself, e.g. `takeHit(n)` |
| **invariant** | Something that must stay true about an object, e.g. "health is never below zero" |
