## The pointer has three moments

Click the canvas first: a page does not give the game the pointer until it is over the game.

- `mouse.x` and `mouse.y` are the pointer's position **right now**, in pixels.
- `mouse.presses()` is true on **one frame** per click.
- `mouse.pressing()` is true on **every frame** the button is held.
- `mouse.released()` is true on **one frame**, when the button is let go.

Keys have the same three: `kb.presses('space')`, `kb.pressing('space')`, `kb.released('space')`.

## Why three

A pool shot is: pull back (hold), aim (hold), let go (release). The shot happens on the third
moment, not the first: a shot fired on `presses()` cannot know how far you pulled.

```js
if (mouse.pressing()) {
  line(cue.x, cue.y, mouse.x, mouse.y);
}
if (mouse.released()) {
  // the shot goes here
}
```

The pointer reads `(0, 0)` until it has moved over the canvas, so a game that draws a line
before the first move draws it to the top-left corner. That is expected, not a bug.

## The three calls an aim line needs

- `stroke('white')` sets the colour of lines; `noStroke()` puts it back.
- `line(x1, y1, x2, y2)` draws from one point to another.
- `dist(x1, y1, x2, y2)` is the distance between two points, in pixels, as a number.
- `round(n)` turns a long decimal into a readable number (`round(4.81)` is `5`).

Those four are all the drawing an aim line needs: a colour, a line, and a number to show how far
the pull is.
