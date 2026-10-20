## Plain English to Pseudocode: A Method That Calls a Method

**What you'll practise:**
- Turning plain English into exact, numbered steps
- Showing a call to another method as one step
- Seeing what "either way" and "then it comes back" really mean

Plain English is how you think a program through. Pseudocode is the step after: the same plan, but exact enough that every line maps to one line of real code. This one is **a single method**, which starts when it is called and ends when it hands control back.

### The plan, in plain English

An enemy in the game needs a `takeDamage` method. Here is what the game designer wants it to do:

1. The enemy is hit for some amount of damage.
2. Take that amount off the enemy's health.
3. If the health is now zero or less, the enemy dies.
4. Either way, the enemy flashes red to show it was hit.
5. Then control goes back to whoever hit it.

Two of those steps are jobs that other methods already do: **`die`** removes the sprite and adds to the score, and **`flashRed`** turns the sprite red. You do not write what happens inside them.

Here is the same plan as a flow chart. You do not draw it, you **read** it: follow the arrows and match each box to one of the five steps.

```flow readonly caption="Figure 5.4.6: takeDamage. The die call sits on one branch, and both branches reach flashRed."
flowchart TD
  A([takeDamage amount starts]) --> B[health = health - amount]
  B --> C{health <= 0}
  C -- yes --> D[[this.die]]
  C -- no --> E[[this.flashRed]]
  D --> E
  E --> F([back to the caller])
```

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there, and they are not "Start" and "End": they are what the edges of a method actually are. Write your steps **between** them.

| Write this | Use it for |
|---|---|
| `SET health TO health - amount` | a plain step that changes something |
| `IF health <= 0` ... `END IF` | the decision, with the steps inside it indented |
| `CALL die` / `CALL flashRed` | calling another method: one line each |

Number every step. The shape you are aiming for is five numbered lines, with one of them indented inside the decision.

### The line that catches people

Plain English step 4 says "**either way**." In pseudocode that has a precise meaning: the flash is **not inside** the decision. It comes after `END IF` and is not indented, so it runs whether the enemy died or not.

Is that what the designer wants? An enemy that just died still flashes red, on a sprite that `die` already removed. English hid that question. Pseudocode makes it askable.

### Before you submit

Check that all six requirements are green, then trace two calls through your steps by hand:

- an enemy on 30 health taking 5 damage
- the same enemy taking 40 damage

Both reach **back to the caller**. Exactly one of them passes through `CALL die`. Both pass through `CALL flashRed`.

If your second trace stops at `CALL die` and never comes back, you wrote a call as an exit. It is not: it is a step, and steps return.

### Compare your answer

<details>
<summary>Open after all six checks are green</summary>

Your pseudocode, as real JavaScript. Each of your steps is one line:

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

</details>
