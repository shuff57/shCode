## Words on a sprite, and sprites that run out

**Read before `5.7.2 Worked Example: A "+5" that floats away`.** About 8 minutes.

Your pinball game works. This reading starts making it feel finished: a bumper that shows what it is worth, and a little "+5" that pops up on a hit and then goes away by itself.

By the end of this reading you should be able to answer:

- How does a sprite carry its own words, and how do you change their colour and size?
- What does `.life = 60` do to a sprite?
- Why was `life` on the list of names not to use in 5.4.5?
- When is it fine to make a sprite in `draw()`?

**A sprite can wear words.** In 5.1.21 you drew words on the canvas with `text()`. A sprite can also carry its own words, written in its middle, with `.text`:

```js
box.text = 5;
```

`.text` takes words in quotes (`'BONUS'`) or a number (`5`), and moSHion writes it in the middle of the sprite. One catch: a plain `0` shows nothing at all, because moSHion reads 0 as "no words". To show a zero, write it in quotes: `box.text = '0';`. The words move with the sprite, so you never work out where to draw them. Two more properties set how they look:

- `.textColor` is the colour of the words. It takes the same kind of colour as `.color`, such as `'black'`. It starts as `'white'`.
- `.textSize` is how tall the letters are, in pixels, like `textSize()` in 5.1.21. It starts at `16`.

The words always stay upright, even when the sprite turns.

One more property changes how the whole sprite looks: `.opacity` runs from `1` (solid, where every sprite starts) down to `0` (invisible), and it fades the sprite's colour and its words together. `box.opacity = 0.5;` is half see-through. (A fourth number in `fill()` does nothing in moSHion, so `.opacity` is the way to fade a sprite.)

**Try it:** a box that spins (the `rotationSpeed` from 5.1.22) wearing the number 5, and a gold ball wearing a black word.

```js live
let box, ball;

function setup() {
  new Canvas(400, 240);

  box = new Sprite(120, 120, 90, 50);
  box.color = 'sienna';
  box.text = 5;
  box.rotationSpeed = 1;

  ball = new Sprite(290, 120, 70);
  ball.color = 'gold';
  ball.text = 'BONUS';
  ball.textColor = 'black';
  ball.textSize = 14;
}

function draw() {
  background('#222');
}
```

**What you'll see:** the brown box turns slowly, and the 5 on it stays upright. The gold ball says BONUS in small black letters.

**A sprite can run out.** Set `.life` to a number and the sprite counts down by one every frame. When it reaches 0, moSHion deletes it, the same as calling `.delete()` on it (5.2.15). `draw()` runs about 60 times a second, so:

```js
spark.life = 60;   // gone about one second from now
```

`.life = 30` is half a second, and `.life = 120` is two seconds. You set it once, and the sprite cleans itself up. You never write the `.delete()` yourself.

**This is why `life` was on the do-not-use list.** In 5.4.5 you stored your own values on each bumper, `worth` and `wasTouching`, and the step warned you to keep away from names a sprite already has. `life` is one of them. If you had stored a bumper's three lives as `b.life = 3`, you would not have made a new value at all: you would have told moSHion to delete that bumper three frames later, and it would vanish before you saw it.

**When is it fine to make a sprite in `draw()`?** In 5.1 the bug was a `new Sprite(...)` straight inside `draw()`: it made a new sprite on every frame, 60 a second. A sprite made inside an `if` that is true on **one frame only** is different. A key press (`kb.presses`) or the frame a hit starts (`touching && !wasTouching`, 5.4.4) makes exactly one sprite each time it happens. Give that sprite a `.life`, and it goes away by itself, so they never pile up.

**Try it:** each press of the space bar makes one orange spark at a random spot (`random` from 5.2.1). Each one lives for 60 frames, about one second.

```js live
function setup() {
  new Canvas(400, 240);
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('click here, then press space', 20, 26);

  if (kb.presses(' ')) {
    const spark = new Sprite(random(40, 360), random(70, 210), 30);
    spark.collider = 'none';   // nothing bumps into it (5.2.16)
    spark.color = 'orange';
    spark.text = 'hi';
    spark.textColor = 'black';
    spark.life = 60;
  }
}
```

**What you'll see:** one spark per press. Each one disappears about a second after it appeared. Press the space bar quickly and several are on screen at once, each running out on its own clock.

**Try this:**

1. In the second sketch, change `spark.life = 60;` to `spark.life = 180;` and press the space bar a few times. Each spark now stays about three seconds.
2. Change `kb.presses(' ')` to `kb.pressing(' ')` and hold the space bar down. Now it is true on every frame you hold it, so a new spark appears every frame, 60 a second. `.life` still cleans them up, but this is the made-every-frame bug from 5.1 again. Change it back.
3. In the first sketch, add `box.life = 3;` on the line after `box.rotationSpeed = 1;` and run it. The box is gone before you can see it. That is the do-not-use warning from 5.4.5.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`.text`** | Words or a number written in the middle of a sprite. They move with it and stay upright. |
| **`.textColor`** | The colour of a sprite's words. Starts as `'white'`. |
| **`.textSize`** | How tall a sprite's letters are, in pixels. Starts at `16`. |
| **`.opacity`** | How solid a sprite is, from `1` (solid) to `0` (invisible). Fades its colour and words together. |
| **`.life`** | Frames left before moSHion deletes the sprite. `60` is about one second. |
