**Goal:** Build the complete arcade loop: title screen → gameplay → game over → restart. Every game you've played has this flow. Now you build it.

## Step 1 — State variable and switch skeleton

Three states: `'title'`, `'play'`, `'gameover'`. Each case draws something different. `state` starts as `'title'` — the first thing the player sees.

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
      text('Asteroid Dodge', 80, 100);
      textSize(16);
      text('Press ENTER to play', 115, 200);
      break;

    case 'play':
      fill('#50fa7b');
      textSize(24);
      text('Playing...', 140, 160);
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(36);
      text('Game Over', 110, 120);
      textSize(16);
      text('Press R to restart', 115, 200);
      break;
  }
}
```

Three screens. One variable. Run it. Nothing happens yet — we need transitions.

## Step 2 — Title transitions to play

Press Enter on the title screen → `state = 'play'`. That's the first transition.

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
      text('Asteroid Dodge', 80, 100);
      textSize(16);
      text('Press ENTER to play', 115, 200);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      fill('#50fa7b');
      textSize(24);
      text('Playing...', 140, 150);
      textSize(14);
      text('Press G to trigger game over', 95, 180);
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(36);
      text('Game Over', 110, 120);
      textSize(16);
      text('Press R to restart', 115, 200);
      break;
  }
}
```

## Step 3 — Gameplay: player movement, score, and losing condition

The play state now has real mechanics. A player sprite moves with WASD. A score counter ticks up. An asteroid moves across — if it hits the player, they lose a life. When health reaches 0, game over.

```js live
let state = 'title';
let player, asteroid, score, health;

function setup() {
  new Canvas(400, 300);
  score = 0;
  health = 3;
  player = new Sprite(100, height / 2, 20, 20, 'dynamic');
  player.color = '#50fa7b';
  asteroid = new Sprite(width + 60, random(40, 260), 25, 25, 'dynamic');
  asteroid.color = '#ffb86c';
  asteroid.vel.x = -2;
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Asteroid Dodge', 80, 100);
      textSize(16);
      text('Press ENTER to play', 115, 200);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      score++;
      fill('#f8f8f2');
      textSize(16);
      text('Score: ' + score, 10, 25);
      text('Health: ' + health, 10, 50);

      if (kb.pressing('w')) player.vel.y = -3;
      else if (kb.pressing('s')) player.vel.y = 3;
      else player.vel.y = 0;

      if (kb.pressing('d')) player.vel.x = 3;
      else if (kb.pressing('a')) player.vel.x = -3;
      else player.vel.x = 0;

      if (asteroid.x < -50) {
        asteroid.x = width + 60;
        asteroid.y = random(40, 260);
      }

      if (player.overlaps(asteroid)) {
        health--;
        asteroid.x = width + 60;
        asteroid.y = random(40, 260);
      }

      if (health <= 0) state = 'gameover';
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(36);
      text('Game Over', 110, 100);
      fill('#f8f8f2');
      textSize(20);
      text('Final Score: ' + score, 115, 200);
      textSize(14);
      text('Press R to play again', 120, 230);
      break;
  }
}
```

## Step 4 — Game over restarts the loop

Press R on the game over screen → remove old player and asteroid, create new ones, reset score and health, go back to `'play'`. The complete arcade loop is now closed.

```js live
let state = 'title';
let player, asteroid, score, health;

function createObjects() {
  player = new Sprite(100, height / 2, 20, 20, 'dynamic');
  player.color = '#50fa7b';
  asteroid = new Sprite(width + 60, random(40, 260), 25, 25, 'dynamic');
  asteroid.color = '#ffb86c';
  asteroid.vel.x = -2;
  score = 0;
  health = 3;
}

function setup() {
  new Canvas(400, 300);
  createObjects();
}

function draw() {
  background('#282a36');

  switch (state) {
    case 'title':
      fill('#f8f8f2');
      textSize(36);
      text('Asteroid Dodge', 80, 100);
      textSize(16);
      text('Press ENTER to play', 115, 200);
      if (kb.presses('Enter')) state = 'play';
      break;

    case 'play':
      score++;
      fill('#f8f8f2');
      textSize(16);
      text('Score: ' + score, 10, 25);
      text('Health: ' + health, 10, 50);

      if (kb.pressing('w')) player.vel.y = -3;
      else if (kb.pressing('s')) player.vel.y = 3;
      else player.vel.y = 0;

      if (kb.pressing('d')) player.vel.x = 3;
      else if (kb.pressing('a')) player.vel.x = -3;
      else player.vel.x = 0;

      if (asteroid.x < -50) {
        asteroid.x = width + 60;
        asteroid.y = random(40, 260);
      }

      if (player.overlaps(asteroid)) {
        health--;
        asteroid.x = width + 60;
        asteroid.y = random(40, 260);
      }

      if (health <= 0) state = 'gameover';
      break;

    case 'gameover':
      fill('#ff5555');
      textSize(36);
      text('Game Over', 110, 100);
      fill('#f8f8f2');
      textSize(20);
      text('Final Score: ' + score, 115, 200);
      textSize(14);
      text('Press R to play again', 120, 230);

      if (kb.presses('r')) {
        player.remove();
        asteroid.remove();
        createObjects();
        state = 'play';
      }
      break;
  }
}
```

## Key takeaways

- The arcade loop is always the same: **title → play → gameover → title/play**.
- Each state does exactly one job — title shows the name, play runs the game, gameover shows results.
- Transitions are explicit: press Enter to start, condition triggers game over, press R to restart.
- Restart means: clean up old objects, create new ones, reset variables, change state.
- One `state` variable is the single source of truth for the entire game flow.
