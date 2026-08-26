**Goal:** Build a title screen that waits for the player, then transitions to gameplay. The most common pattern in games: title → play.

## Step 1: Title screen with game name

`state` starts as `'title'`. The switch draws the game name and instructions. Nothing moves: it's just waiting.

```js live
let state = 'title';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Space Runner', 90, 120);
      textSize(16);
      text('Press ENTER to start', 115, 170);
      break;
  }
}
```

## Step 2: Enter key transitions to play

Add the transition: when `kb.presses('Enter')` is true, `state` changes to `'play'`. Add the play state with a simple game.

```js live
let state = 'title';
let score;

function setup() {
  new Canvas(400, 300);
  score = 0;
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Space Runner', 90, 120);
      textSize(16);
      text('Press ENTER to start', 115, 170);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      score++;
      fill('#50fa7b');
      textSize(24);
      text('Score: ' + score, 10, 40);
      textSize(14);
      text('Press G for game over', 10, 70);
      break;
  }
}
```

## Step 3: Add player movement in the play state

Now the play state has real gameplay: a player sprite that moves with arrow keys. Score keeps incrementing.

```js live
let state = 'title';
let score, player;

function setup() {
  new Canvas(400, 300);
  score = 0;
  player = new Sprite(width / 2, height / 2, 20, 20, 'dynamic');
  player.color = '#50fa7b';
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Space Runner', 90, 120);
      textSize(16);
      text('Press ENTER to start', 115, 170);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      score++;
      fill('#f8f8f2');
      textSize(18);
      text('Score: ' + score, 10, 30);
      text('Player: (' + floor(player.x) + ', ' + floor(player.y) + ')', 10, 55);
      text('Press G for game over', 10, 80);

      if (kb.pressing('ArrowUp')) player.vel.y = -3;
      else if (kb.pressing('ArrowDown')) player.vel.y = 3;
      else player.vel.y = 0;

      if (kb.pressing('ArrowRight')) player.vel.x = 3;
      else if (kb.pressing('ArrowLeft')) player.vel.x = -3;
      else player.vel.x = 0;

      if (kb.presses('g')) { player.remove(); state = 'gameover'; }
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(36);
      text('Game Over', 110, 130);
      fill('#f8f8f2');
      textSize(16);
      text('Final Score: ' + score, 140, 170);
      break;
  }
}
```

## Step 4: Restart from game over

Add a restart transition: press R on the game over screen → destroy old player, make new one, reset score, go back to play.

```js live
let state = 'title';
let score, player;

function setup() {
  new Canvas(400, 300);
  score = 0;
  player = new Sprite(width / 2, height / 2, 20, 20, 'dynamic');
  player.color = '#50fa7b';
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Space Runner', 90, 120);
      textSize(16);
      text('Press ENTER to start', 115, 170);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      score++;
      fill('#f8f8f2');
      textSize(18);
      text('Score: ' + score, 10, 30);
      text('Player: (' + floor(player.x) + ', ' + floor(player.y) + ')', 10, 55);
      text('Press G for game over', 10, 80);

      if (kb.pressing('ArrowUp')) player.vel.y = -3;
      else if (kb.pressing('ArrowDown')) player.vel.y = 3;
      else player.vel.y = 0;

      if (kb.pressing('ArrowRight')) player.vel.x = 3;
      else if (kb.pressing('ArrowLeft')) player.vel.x = -3;
      else player.vel.x = 0;

      if (kb.presses('g')) { player.remove(); state = 'gameover'; }
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(36);
      text('Game Over', 110, 130);
      fill('#f8f8f2');
      textSize(18);
      text('Final Score: ' + score, 115, 180);
      textSize(14);
      text('Press R to restart, T for title', 85, 210);
      if (kb.presses('r')) {
        player.remove();
        player = new Sprite(width / 2, height / 2, 20, 20, 'dynamic');
        player.color = '#50fa7b';
        score = 0;
        state = 'play';
      }
      if (kb.presses('t')) {
        player.remove();
        player = new Sprite(width / 2, height / 2, 20, 20, 'dynamic');
        player.color = '#50fa7b';
        score = 0;
        state = 'title';
      }
      break;
  }
}
```

## Key takeaways

- A title screen is just a state: nothing special, no special variable.
- Title screen waits for input, then transitions to play.
- The play state owns the game logic: movement, scoring, collision.
- Game over displays results and offers restart or title: both require resetting variables + changing state.
- Each state (title, play, gameover) has a clean, single job.
