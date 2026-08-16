## Chart the Code — A Method That Calls a Method

**What you'll practise:**
- Charting one method rather than a whole program
- Using the double-rail for a method on the same object
- Seeing what "and then it comes back" really means

Everything you have charted so far has been a whole program. This one is smaller and stranger: **a chart of a single method**, which starts when the method is called and ends when it hands control back.

### The code

```js
class Enemy {
  takeDamage(amount) {
    this.health = this.health - amount;

    if (this.health <= 0) {
      this.die();
    }

    this.flashRed();
  }

  die() {
    this.sprite.remove();
    game.score = game.score + 10;
  }

  flashRed() {
    this.sprite.color = "red";
  }
}
```

### What to draw

Chart `takeDamage` only. The two ovals are already placed and named — notice they are not "Start" and "End" but **`takeDamage(n) starts`** and **`back to the caller`**, because that is what the boundaries of a method actually are.

| Shape | Use it for |
|---|---|
| **Function call** (double rail) | `this.die()` and `this.flashRed()` |
| **Task** (rectangle) | subtracting the damage |
| **Decision** (diamond) | `health <= 0` |

At least six shapes, at least one decision.

### `this.die()` is one shape

Do not chart what happens inside `die()`. It removes a sprite and adds to the score, and none of that belongs here. On this chart it is **one double-rail box**, flow goes in, flow comes back, and the next thing happens.

That is the entire reason methods are worth having, and this chart is where it becomes visible: `takeDamage` does not need to know how dying works. If you later change `die()` to play a sound and drop a coin, **this chart does not change at all.**

### The line that catches people

`this.flashRed()` is **after** the `if`, not inside it. So it runs whether the enemy died or not — which means on your chart, **both arrows out of the diamond reach it**.

Now read what that says about the program: an enemy that just died still flashes red. Is that right? Arguably yes, it is a hit and it should look like one. But `die()` has already removed the sprite, so `flashRed()` is setting a colour on something that is no longer on screen.

That is not a crash and not a bug the checker can see. It is a **question about design**, and the chart is what makes it askable — you can see the two boxes on the same path.

### Before you submit

Press **Check my diagram**, then trace two calls by hand:

- an enemy on 30 health taking 5 damage
- the same enemy taking 40 damage

Both should reach **back to the caller**. Exactly one of them should pass through `this.die()`. Both should pass through `this.flashRed()`.

If your second trace stops at `die()` and never comes back, you have drawn a method call as an exit. It is not — it is a step, and steps return.
