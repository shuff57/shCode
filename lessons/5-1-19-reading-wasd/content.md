## Key names: WASD and the arrow keys

Read before `5.1.15 Reading: Velocity: vel.x and vel.y`. About 5 minutes.

By the end of this reading you should be able to answer:

- What goes inside the parentheses of `kb.pressing(...)` to pick a letter key? To pick an arrow key?
- Which four letter keys do games usually use for left, right, up and down?
- Do you have to choose one set of keys for a whole program?

You already know that `kb.pressing('w')` is `true` while the **w** key is held. The text inside the quotes is a **key name**, and it decides which key the line is listening to. There are two sets of key names you will use to move things.

**What you'll learn from it:**

- A letter key is named by its letter, in lowercase, inside quotes: `'a'`, `'d'`, `'w'`, `'s'`.
- An arrow key is named by a word: `'left'`, `'right'`, `'up'`, `'down'`.
- Many games use the four letters **WASD** for movement because they sit under one hand: `'a'` is left, `'d'` is right, `'w'` is up, and `'s'` is down.
- Both sets work anywhere `kb.pressing(...)` works. The rest of the code stays exactly the same; only the key name changes. In this module's labs, either set is accepted.
- An arrow word also listens to its WASD twin: `kb.pressing('left')` is `true` for the left arrow **or** the **a** key. A letter listens only to itself: `kb.pressing('a')` is `true` only for **a**.
- The sketch only hears your keys after you click on it, so click the canvas before you press anything.

**Try it:**

Each key below turns the square a different color, so you can see which one you pressed. When no key is held, the square goes back to gray, because the first line of `draw()` paints it gray every frame, before any key is checked.

```js live
let box;

function setup() {
  new Canvas(360, 200);
  box = new Sprite(180, 100, 80, 80);
}

function draw() {
  background('#222');
  box.color = 'gray';

  if (kb.pressing('left'))  box.color = 'gold';
  if (kb.pressing('a'))     box.color = 'tomato';
  if (kb.pressing('right')) box.color = 'orchid';
  if (kb.pressing('d'))     box.color = 'mediumseagreen';
}
```

**What you'll see:** a gray square. Click the canvas, then hold **a**, **left**, **d** or **right**. Each one gives its own color.

**Try this:**

1. Hold **a**, then let go and hold the **left arrow**. The left arrow makes only the `'left'` line true, so the square turns gold. The **a** key makes **both** lines true (`'left'` listens to **a** too), and the lower line runs last, so tomato wins. Step 4 says more about the lowest line winning.
2. Change `'a'` to `'w'` and `'left'` to `'up'`. Rerun, click the canvas, and check that **w** and the **up arrow** now change the color.
3. Change `'d'` to `'s'` and `'right'` to `'down'`. Rerun and check **s** and the **down arrow**.
4. Hold two keys at once. The color of the line written **lowest** wins, because the lines run from top to bottom and the last one to change the color has the final say.
5. Delete the line `box.color = 'gray';` and rerun. Press a key, then let go: the square keeps its color, because nothing puts it back any more. Put the line back. Anything a key changes needs a line that puts it back when no key is held. You will meet this rule again when keys change a sprite's speed.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Key name** | The text in quotes you give `kb.pressing(...)` to say which key to listen to. Always lowercase. |
| **WASD** | The four letter keys often used for movement: `'a'` left, `'d'` right, `'w'` up, `'s'` down. |
| **Arrow key names** | The words `'left'`, `'right'`, `'up'` and `'down'`. Each one also listens to its WASD twin. |
| **Focus** | A sketch only receives key presses after you click on it. |
