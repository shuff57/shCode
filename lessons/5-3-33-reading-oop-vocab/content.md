## Encapsulation, inheritance, polymorphism

**Read at the close of Unit 2.2.** About 4 minutes.

By the end of this reading you should be able to give a one-sentence definition of each term in your own words.

OOP textbooks and college courses all invoke three vocabulary words. You will hear them again. This reading gives you a working definition for each so the word lands when it shows up, not so you practice them this week.

**What you'll learn from it:**

- **Encapsulation**: bundling data and behavior inside a single unit, and controlling what the outside world can see.
- **Inheritance**: one class extends another class, receiving all its properties and methods automatically.
- **Polymorphism**: different classes can respond to the same method name in different ways.

---

### Encapsulation

In the `Counter` class you wrote in labs 2.2.7b–e, the count `n` lived inside the class. Outside code only ever touched it through methods like `tick()`, `addBy()`, and `isHigh()`. Outside code never reached in and said `c.n = 999`. That "keep data inside, expose it through methods" discipline is **encapsulation**. The class is a closed box: you push the right button and it does the right thing; you don't need to know the wiring.

Encapsulation matters because it limits how many places in a program can break a piece of state. If `n` is only ever changed through `tick()` and `addBy()`, there are exactly two places to look when something goes wrong.

---

### Inheritance

You've seen `class Enemy { ... }`. Inheritance would look like:

```js
class BossEnemy extends Enemy {
  // BossEnemy automatically gets constructor, damage(), render() from Enemy
  // then adds its own methods on top
}
```

`extends` makes `BossEnemy` a *subclass* of `Enemy`. Every property and method on `Enemy` is automatically available on `BossEnemy`. You write only the *differences*.

Inheritance is powerful and can create hard-to-debug problems when the parent class has complex behavior (like `Sprite`). This is why this unit taught composition first. You will not write `extends` or `super()` this year.

---

### Polymorphism

Imagine an array of game objects: some are `Enemy`, some are `Collectible`, some are `PowerUp`. Each class has its own `render()` method that draws itself differently. A single `for` loop can call `.render()` on every element, and each object runs *its own version*. Same method name, different behavior per class. That's **polymorphism**.

```js
// Each class has its own render(): loop doesn't care which:
for (let obj of allObjects) {
  obj.render();
}
```

You will not implement polymorphism this year. If a future course asks you to, you'll already have the vocabulary.

**Try it:**

```js live
// Three classes, same method name, different behavior
class Square {
  constructor(x) { this.x = x; }
  draw() {
    fill('deepskyblue');
    square(this.x, 90, 40);
  }
}

class Circle {
  constructor(x) { this.x = x; }
  draw() {
    fill('orange');
    circle(this.x, 110, 40);
  }
}

let shapes;

function setup() {
  new Canvas(360, 200);
  shapes = [new Square(80), new Circle(180), new Square(280)];
}

function draw() {
  background('#222');
  for (let s of shapes) s.draw();  // polymorphism in action
}
```

**What you'll see:** two blue squares and one orange circle: each drawn by its own `draw()` method. Same loop call, different rendering per class.

**Try this:** add a `Triangle` class with its own `draw()` that draws a triangle and push one into `shapes`. The loop doesn't change: it just works.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Encapsulation** | Bundling data and behavior into one unit; outside code uses methods, not raw properties. |
| **Inheritance** | A subclass (`extends`) automatically receives all properties and methods of its parent class. |
| **Polymorphism** | Different classes implement the same method name; the caller doesn't need to know which class it's talking to. |
