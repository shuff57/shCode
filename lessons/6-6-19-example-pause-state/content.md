**Goal:** Add a pause state that freezes gameplay without resetting anything. Press P to toggle: the game is still there when you unpause.

## Step 1: Add a pause case to the switch

Start from a working play state with player movement. Add `'pause'` as a new case in the switch. For now, the pause case just draws the frozen game underneath and overlays "PAUSED" text.

```js live
let state, score, player;

function setup() {
  new Canvas(500, 400);
  state = 'play';
  score = 0;
  player = new Sprite(250, 350, 30, 30);
  player.color = '#50fa7b';
}

function draw() {
  background('#222');

  if (state === 'play') {
    if (kb.pressing('a'))       player.vel.x = -5;
    else if (kb.pressing('d'))  player.vel.x = 5;
    else                         player.vel.x = 0;

    score++;
    text(`Score: ${score}`, 10, 20);
    text('Press P to pause', 10, 50);
  }

  if (state === 'pause') {
    textSize(32);
    text('PAUSED', 170, 200);
    textSize(16);
    text('Press P to resume', 180, 240);
  }
}
```

## Step 2: Toggle between play and pause

Add the P-key check inside both states. In `'play'`, pressing P switches to `'pause'`. In `'pause'`, pressing P switches back. Notice: score **stops** incrementing while paused: that's the point.

Two details make the toggle work:

- Use `kb.presses('p')`, not `kb.pressing('p')`. `pressing` is true on every frame the key is held down, so the state would flip back and forth for as long as your finger is on P. `presses` is true only on the one frame the key goes down.
- Make the second check an `else if`. With two separate `if`s, the frame that switches to `'pause'` also runs the pause case, sees the same press, and switches straight back to `'play'`. With `else if`, only one state runs each frame.

The pause case also sets `player.vel.x = 0`, so a player who was moving when you pressed P stops where they are instead of sliding on.

```js live
let state, score, player;

function setup() {
  new Canvas(500, 400);
  state = 'play';
  score = 0;
  player = new Sprite(250, 350, 30, 30);
  player.color = '#50fa7b';
}

function draw() {
  background('#222');

  if (state === 'play') {
    if (kb.pressing('a'))       player.vel.x = -5;
    else if (kb.pressing('d'))  player.vel.x = 5;
    else                         player.vel.x = 0;

    score++;
    text(`Score: ${score}`, 10, 20);
    text('Press P to pause', 10, 50);

    if (kb.presses('p')) state = 'pause';
  } else if (state === 'pause') {
    player.vel.x = 0;   // a paused player stands still
    text(`Score: ${score}`, 10, 20);
    textSize(32);
    text('PAUSED', 170, 200);
    textSize(16);
    text('Press P to resume', 180, 240);

    if (kb.presses('p')) state = 'play';
  }
}
```

## Step 3: Show the game behind the pause overlay

Draw the game elements AGAIN in the pause case (score text, player position) so the frozen game is visible behind the pause message. Then draw the PAUSED overlay on top.

```js live
let state, score, player;

function setup() {
  new Canvas(500, 400);
  state = 'play';
  score = 0;
  player = new Sprite(250, 350, 30, 30);
  player.color = '#50fa7b';
}

function draw() {
  background('#222');

  if (state === 'play') {
    if (kb.pressing('a'))       player.vel.x = -5;
    else if (kb.pressing('d'))  player.vel.x = 5;
    else                         player.vel.x = 0;

    score++;
    text(`Score: ${score}`, 10, 20);
    text('Press P to pause', 10, 50);

    if (kb.presses('p')) state = 'pause';
  } else if (state === 'pause') {
    player.vel.x = 0;   // a paused player stands still
    text(`Score: ${score}`, 10, 20);

    fill('rgba(0, 0, 0, 0.5)');   // black at half strength: dims, does not hide
    rect(0, 0, 500, 400);
    fill(255);
    textSize(32);
    text('PAUSED', 170, 200);
    textSize(16);
    text('Press P to resume', 180, 240);

    if (kb.presses('p')) state = 'play';
  }
}
```

## Key takeaways

- Pause **stops updating** game variables: score freezes, movement stops.
- Game data (score, position) is **preserved**, just not changed while paused.
- The toggle pattern: pressing the same key in opposite states toggles between them. It needs `kb.presses` (one frame per press) and `else if` (one state per frame), or the state flips straight back.
- Draw the game behind the overlay so the player sees what's frozen.
- A semi-transparent rectangle (`fill('rgba(0, 0, 0, 0.5)')`) dims the background to make the overlay pop. The last number in `rgba(...)` runs from 0 (see-through) to 1 (solid). p5's form `fill(0, 0, 0, 120)` works too; there the last number runs from 0 to 255.
