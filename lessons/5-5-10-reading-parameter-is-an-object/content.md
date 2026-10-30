## A parameter that is another object

**Read before `5.8.11 Worked Example: player.hit(enemy)`.** About 5 minutes.

By the end of this reading you should be able to answer:

- In `a.distanceTo(b)`, which object does `this` mean, and which does `other` mean?
- Why is `player.hit(enemy)` not the same as `enemy.hit(player)`?
- What does a method need to know about the object handed to it?

5.7.1 (Reading: Methods) showed you `distanceTo(other)` as a way to see what a method declaration looks like. You read past the interesting part: `other` is a **whole second object**, of the same class, handed in as an argument.

```js
a.distanceTo(b);
//  ^ receiver        ^ parameter
//  this = a          other = b
```

Two separate instances are in play, and the method can read both:

```js live
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  distanceTo(other) {
    let dx = this.x - other.x;   // this and other are two different Points
    let dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

let a, b;

function setup() {
  new Canvas(360, 180);
  a = new Point(2, 3);
  b = new Point(8, 11);
}

function draw() {
  background('#222');
  fill('white');
  textSize(16);
  text('a.distanceTo(b) = ' + a.distanceTo(b), 20, 70);
  text('b.distanceTo(a) = ' + b.distanceTo(a), 20, 110);
}
```

**What you'll see:** both lines print `10`. For distance, direction does not matter — the method reads from both objects and answers the same either way.

**Direction matters as soon as one object changes the other.** `player.hit(enemy)` and `enemy.hit(player)` are both legal JavaScript, and they mean opposite things:

| Line | `this` is | The other one is | Reads as |
| --- | --- | --- | --- |
| `player.hit(enemy)` | the player | the enemy | the player hits the enemy |
| `enemy.hit(player)` | the enemy | the player | the enemy hits the player |

The choice of which line you write *is* the design decision. A method that acts on its parameter should be named so the direction is obvious from the call.

**What the method may assume about the parameter.** Inside `player.hit(enemy)`, the method may use anything `Enemy` promises: `enemy.takeHit(1)`, `enemy.isAlive()`. It may not assume `enemy` is a `Sprite`, or that it has an `hp` — those belong to whichever class defines them. Writing `other.takeHit(1)` says "whatever you are, you know how to be hit", and that is the whole trick.

**Try this:** in the block above, change `distanceTo` to `return this.x + other.x;` and run it. `a.distanceTo(b)` prints `10` and `b.distanceTo(a)` also prints `10` — addition does not care about order either. Now change it to `return this.x - other.x;`: the two lines print `-6` and `6`. You have just watched receiver-and-parameter become a direction.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **receiver** | The object before the dot — the one `this` means inside the method |
| **argument object** | An instance passed in, reachable through the parameter's name (`other`, `enemy`, `target`) |
| **direction** | Which of the two objects is acted on; decided by which one is written before the dot |
