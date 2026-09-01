**Goal:** Build a survival game where the player dodges an enemy. When the game ends, save the high score with `storeItem`.

## Step 1: A player, an enemy, and a score

The player moves with WASD. An enemy sprite bounces off the walls. The score counts how many frames the player survives. When the enemy touches the player, the game freezes: game over.

```js live
let player, enemy;
let score, gameRunning;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 20, 20);
  player.color = '#50fa7b';
  player.vel = createVector(0, 0);

  enemy = new Sprite(100, 100, 15, 15);
  enemy.color = '#ff5555';
  enemy.vel = createVector(3, 2);
  enemy.bounciness = 1;

  score = 0;
  gameRunning = true;
}

function draw() {
  background('#222');

  if (gameRunning) {
    score++;
    player.vel.set(0, 0);
    if (kb.pressing('w')) player.vel.y = -3;
    if (kb.pressing('s')) player.vel.y = 3;
    if (kb.pressing('a')) player.vel.x = -3;
    if (kb.pressing('d')) player.vel.x = 3;

    if (player.overlaps(enemy)) {
      gameRunning = false;
    }
  }

  text(`Score: ${score}`, 10, 20);
  if (!gameRunning) {
    text('Game Over: press R to restart', 10, 50);
  }
}
```

## Step 2: Save the high score on game over

When the enemy catches the player, compare the current score to the saved high score. If it beats the record, save it with `storeItem`. The `Number()` wrapper and `|| 0` fallback handle the case where nothing has been saved yet (more on this in 6.5.6).

```js live
let player, enemy;
let score, highScore, gameRunning;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 20, 20);
  player.color = '#50fa7b';
  player.vel = createVector(0, 0);

  enemy = new Sprite(100, 100, 15, 15);
  enemy.color = '#ff5555';
  enemy.vel = createVector(3, 2);
  enemy.bounciness = 1;

  score = 0;
  highScore = Number(getItem('highScore')) || 0;
  gameRunning = true;
}

function draw() {
  background('#222');

  if (gameRunning) {
    score++;
    player.vel.set(0, 0);
    if (kb.pressing('w')) player.vel.y = -3;
    if (kb.pressing('s')) player.vel.y = 3;
    if (kb.pressing('a')) player.vel.x = -3;
    if (kb.pressing('d')) player.vel.x = 3;

    if (player.overlaps(enemy)) {
      gameRunning = false;
      if (score > highScore) {
        storeItem('highScore', score);
        highScore = score;
      }
    }
  }

  text(`Score: ${score}`, 10, 20);
  text(`Best:  ${highScore}`, 10, 40);
  if (!gameRunning) {
    text('Game Over: press R to restart', 10, 70);
  }
}
```

## Step 3: Reload and verify

Reload the page. Run the game again. Let the enemy catch you quickly: the old high score is still displayed as `Best:`. The save worked.

Now play again and try to survive longer than your saved high score. When the enemy finally catches you and you beat the record, `Best:` updates to the new value. Reload one more time: the new record is still there.

## Key takeaways

- Save on events, not every frame: `storeItem` belongs inside an `if` that checks whether something meaningful changed.
- The game-over moment is the natural save point: the player's run just ended, so this is when you know the final score.
- `Number(getItem('highScore')) || 0` reads whatever was saved last session, or starts at `0` if nothing was saved yet.
- After reload, the save data is still there: test this yourself to build confidence in persistence.
