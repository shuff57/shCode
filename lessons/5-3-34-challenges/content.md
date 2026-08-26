## Challenge 1: isAlive method (easy)

Add an `isAlive()` method to an `Enemy` class that returns `true` when the enemy still has health.

**How it should work:**

```js
class Enemy {
  constructor(x, y, hp) {
    // store x, y, hp on this
  }

  isAlive() {
    // return true if hp > 0
  }
}
```

Instantiate it with `new Enemy(...)` and check `enemy.isAlive()` in your draw loop.

**Hints:**
- `this.hp > 0` is the entire method body.
- Try setting `this.hp = 0` after a few seconds to see it flip.

---

## Challenge 2: Player class (medium)

Write a `Player` class that wraps position and velocity, with a `move(dir)` method and a `jump()` method.

**Target shape:**

```js
class Player {
  constructor(x, y) {
    // store position, set vel.x and vel.y to 0
  }

  move(dir) {
    // set vel.x based on dir ('left' → negative, 'right' → positive)
  }

  jump() {
    // set vel.y to a negative value to move upward
  }
}
```

Instantiate with `new Player(200, 200)` and call `player.move('left')` or `player.jump()` from your draw loop.

**Hints:**
- You can hook this into a moSHion Sprite by storing the sprite inside the constructor.
- Or keep it pure JS, just track `this.x`, `this.y`, `this.vel`.

---

## Challenge 3: PowerUp subclass (hard)

Write a `PowerUp` class that extends a base `Collectible` class, adding a `boost()` method.

**Target shape:**

```js
class Collectible {
  constructor(x, y, value, color) {
    // store all four args on this
  }
}

class PowerUp extends Collectible {
  constructor(x, y, value, color) {
    super(x, y, value, color);
    // any extra setup
  }

  boost() {
    // return this.value * 2, or apply the boost however you like
  }
}
```

Instantiate with `new PowerUp(100, 100, 10, 'gold')` and call `powerUp.boost()`.

**Hints:**
- `super(...)` must be called before you access `this` in the subclass constructor.
- The auto-grader accepts `this.`, `extends`, or `super(`: you don't need to wire it into the canvas to pass.
- Stretch: display `powerUp.boost()` result as HUD text with `text(...)`.

---

## If you finish all three

- Try combining them: a `Player` that collects `PowerUp` objects and only continues while `enemy.isAlive()` is true.
- Read about `instanceof` in MDN: what does `powerUp instanceof Collectible` return?
- Show a classmate your class hierarchy and explain why you'd use `extends` instead of copying code.
