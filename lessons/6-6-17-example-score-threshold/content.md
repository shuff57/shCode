**Goal:** Wire up condition-driven transitions so the game itself decides when screens change: no button press needed.

## Step 1: Set up a play state with score and health

Start with a play state that tracks two numbers: a score that climbs and a health bar that drains over time. Player moves with A/D, score increments each frame, health decrements slowly.

```js live
let state, score, health, player;

function setup() {
  new Canvas(500, 400);
  state = 'play';
  score = 0;
  health = 100;
  player = new Sprite(250, 350, 30, 60);
  player.color = '#50fa7b';
}

function draw() {
  background('#222');

  if (state === 'play') {
    if (kb.pressing('a'))       player.vel.x = -5;
    else if (kb.pressing('d'))  player.vel.x = 5;
    else                         player.vel.x = 0;

    score++;
    health -= 0.03;

    text(`Score: ${score}`, 10, 20);
    text(`Health: ${ceil(health)}`, 10, 40);
  }
}
```

## Step 2: Add the win condition

When score passes 300, the game is won. In the play case, check `if (score >= 300)` and switch to a `'win'` state. The win screen shows the final score.

```js live
let state, score, health, player;

function setup() {
  new Canvas(500, 400);
  state = 'play';
  score = 0;
  health = 100;
  player = new Sprite(250, 350, 30, 60);
  player.color = '#50fa7b';
}

function draw() {
  background('#222');

  if (state === 'play') {
    if (kb.pressing('a'))       player.vel.x = -5;
    else if (kb.pressing('d'))  player.vel.x = 5;
    else                         player.vel.x = 0;

    score++;
    health -= 0.03;

    text(`Score: ${score}`, 10, 20);
    text(`Health: ${ceil(health)}`, 10, 40);

    if (score >= 300) state = 'win';
  }

  if (state === 'win') {
    textSize(32);
    text('YOU WIN!', 160, 180);
    textSize(16);
    text(`Final Score: ${score}`, 180, 230);
  }
}
```

## Step 3: Add the game over condition

Now check health: when it drops to 0 or below, switch to a `'gameover'` state. Both conditions run every frame inside the play case.

```js live
let state, score, health, player;

function setup() {
  new Canvas(500, 400);
  state = 'play';
  score = 0;
  health = 100;
  player = new Sprite(250, 350, 30, 60);
  player.color = '#50fa7b';
}

function draw() {
  background('#222');

  if (state === 'play') {
    if (kb.pressing('a'))       player.vel.x = -5;
    else if (kb.pressing('d'))  player.vel.x = 5;
    else                         player.vel.x = 0;

    score++;
    health -= 0.03;

    text(`Score: ${score}`, 10, 20);
    text(`Health: ${ceil(health)}`, 10, 40);

    if (score >= 300) state = 'win';
    if (health <= 0)  state = 'gameover';
  }

  if (state === 'win') {
    textSize(32);
    text('YOU WIN!', 170, 180);
    textSize(16);
    text(`Final Score: ${score}`, 180, 230);
    text('Press R to restart', 190, 260);
  }

  if (state === 'gameover') {
    textSize(32);
    text('GAME OVER', 140, 180);
    textSize(16);
    text(`Final Score: ${score}`, 180, 230);
    text('Press R to restart', 190, 260);
  }

  if (state === 'win' || state === 'gameover') {
    if (kb.pressing('r')) {
      state = 'play';
      score = 0;
      health = 100;
      player.x = 250;
    }
  }
}
```

## Key takeaways

- Condition-driven transitions happen **automatically** inside the play case: no key press needed.
- Check conditions **every frame** in `draw()`.
- Multiple conditions can coexist: `score >= 300` triggers win, `health <= 0` triggers game over.
- Restart resets all variables AND the state back to `'play'`.
- Win and game over are **separate states**: they can share a restart key check but draw different text.
