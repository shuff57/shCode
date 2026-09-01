## Why `this.sprite`, not `extends Sprite`

**Read before `5.4.8 Lab: Mutate this.sprite.x from a method`.** About 4 minutes.

By the end of this reading you should be able to answer:

- What is composition, and what is inheritance?
- Why do we prefer `this.sprite = new Sprite(...)` over `class Enemy extends Sprite`?

There are two ways to give your class access to a Sprite: *wrap one* (composition) or *become one* (inheritance). This reading explains the difference and argues for wrapping.

**What you'll learn from it:**

- **Composition:** your class stores a `Sprite` as a property (`this.sprite = new Sprite(...)`). Your class is the owner; the Sprite is a tool it holds.
- **Inheritance:** your class extends `Sprite`, inheriting every property and method that `Sprite` has. Your class *is* a Sprite.
- Inheritance with a complex class like `Sprite` is risky early on: you inherit behavior you may not understand and can accidentally override things the physics engine depends on.
- Composition gives you a clear boundary: `this.sprite` is the moSHion API surface. Everything outside `this.sprite` is your class's own logic.
- **Rule of thumb:** wrap first. When you've mastered the wrapped class, you can consider inheriting.

**Try it:**

Both snippets below make the same 30×30 red square on screen. Read and compare.

```js live
// Composition version: the one we use
class Enemy {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.color = 'red';
    this.hp = 10;
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
  textSize(12);
  text('HP: ' + e.hp, 20, 170);
}
```

**What you'll see:** a red square with HP text below it. `e` is your `Enemy`; the sprite is a tool it holds. You access the sprite via `e.sprite.color`, `e.sprite.x`, etc.: you always know you're in moSHion territory the moment you see `.sprite.`.

**Try this:** read the code and answer, if a `HealthBar` class needed to display a progress bar for the enemy's HP, would it `extends Enemy` or hold a reference `this.enemy = someEnemy`? Think about which creates a cleaner boundary, then open the next lab.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Composition** | A class holds another object as a property. "Has-a" relationship. |
| **Inheritance** | A class extends another class, gaining all its behavior. "Is-a" relationship. |
| **`extends`** | The keyword that makes one class inherit from another. (Vocabulary only this week.) |
| **Wrap-first rule** | When integrating with a complex library class, prefer composition until you fully understand the parent. |
