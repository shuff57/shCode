## One class, many fighters

**Read before 7.16.3 Sub-build: An object that draws itself.** About 12 minutes.

Quest has a hero and, before long, a whole line of enemies. Every one of them has the same parts:
a name, a most hp it can have, the hp it has now, a power for its hits, and a colour. That is
what a class is for (7.1.3, Reading: Class and instance): you write the parts down **once**, and
every `new Fighter(...)` makes another fighter with its own copy of them.

```js
class Fighter {
  constructor(name, maxHp, power, color) {
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.power = power;
    this.color = color;
  }
}
```

The constructor (7.1.5) is handed four values and stores each one on `this`. Look at the third
line: `this.hp = maxHp;`. A fighter starts at full health, so `hp` begins as the same number as
`maxHp`. Only `hp` will go down in a fight; `maxHp` stays, so the game always knows how full the
bar should be.

## A method that answers a question

7.3.9 gave a class its own `isAlive()`. A fighter needs the same one: it is alive while it has
any hp left. The method returns a `true` or `false` (7.2.5, a method that returns a value):

```js
isAlive() {
  return this.hp > 0;
}
```

## A method that draws its object

A method can do anything a function can, and that includes drawing. Give the class a
`draw(x, y)` method, and each fighter can draw **itself** wherever it is told to stand. Inside
it, `this` is whichever fighter is being drawn, so the hero draws the hero's name and the
goblin draws the goblin's.

```js
draw(x, y) {
  fill(this.isAlive() ? this.color : '#555');
  circle(x, y, 70);
  text(this.name, x - 40, y + 60, 16, 'white');
}
```

`this.isAlive()` is a method calling another method of the same object (7.2.6): a fighter with
no hp left is drawn grey.

## An hp bar is a rect scaled by hp / maxHp

A bar is two rects at the same spot. The first, grey, is the whole bar: 120 pixels wide. The
second, on top of it, is the part that is still full. How much is full? `this.hp / this.maxHp`
is a share between 0 and 1: 30 hp out of 30 is `1`, 15 out of 30 is `0.5`, and 0 is `0`.
Multiply the whole width by that share and you have the width of the full part:

```js
fill('#333');
rect(x - 60, y + 70, 120, 10);
fill('limegreen');
rect(x - 60, y + 70, 120 * this.hp / this.maxHp, 10);
```

| hp / maxHp | 120 * hp / maxHp |
| --- | --- |
| 30 / 30 | 120: the whole bar |
| 15 / 30 | 60: half of it |
| 10 / 30 | 40: a third of it |
| 0 / 30 | 0: nothing on top of the grey |

`rect(x, y, w, h)` starts at its top-left corner (6.14.9), so `x - 60` puts a 120-pixel bar
centred under the fighter. The colour can change too: green while more than a third is left,
red after that, with the `? :` you used for the board in 6.27.2:

```js
fill(this.hp > this.maxHp / 3 ? 'limegreen' : 'tomato');
```

Last, the numbers themselves under the bar, small: `text(this.hp + '/' + this.maxHp, x - 60, y + 98, 12, '#ccc');`.

## Two fighters in a list

7.2.13 kept many objects in an array. Quest keeps its two fighters in one list, `fighters`, made
in `newGame()`:

```js
fighters = [new Fighter('Hero', 30, 3, 'gold'), new Fighter('Goblin', 24, 4, 'orange')];
```

`fighters[0]` is always you, and `fighters[1]` is always the one you face. That is worth
deciding now: on day two, "whose turn it is" will be a number, 0 or 1, and `fighters[turn]` will
be the fighter whose turn it is.

Drawing them is one call each, every frame, in `draw()`:

```js
fighters[0].draw(130, 150);
fighters[1].draw(350, 150);
```

Same method, two objects, two different pictures: the hero on the left in gold, the goblin on
the right in orange. Nothing about the hero is written in `draw()`; it all lives in the object.

**Where the words go.** A fighter's own name and numbers are drawn by its `draw(x, y)`, next to
its circle. Quest has no sprites, so nothing is drawn over them. The game's message, the line at
the top that says what just happened, goes in `drawTop()`, as it has since 5.11.1 (Reading: A world that scrolls).
