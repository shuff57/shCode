**Goal:** Build a win screen state that congratulates the player, shows final stats, and offers a replay option — distinct from both the play state and the game over screen.

## Step 1 — Trigger the win state

Start with a play state where the player collects items to reach a goal. When they reach the target, switch to `'win'`. The win screen shows a congratulatory message and the final score.

```js live
let state, score, goal, player, item;

function setup() {
  new Canvas(500, 400);
  state = 'play';
  score = 0;
  goal = 10;
  player = new Sprite(250, 200, 30, 30);
  player.color = '#50fa7b';
  item = new Sprite(random(10, 490), random(10, 390), 20, 20);
  item.color = '#f1fa8c';
}

function draw() {
  background('#222');

  if (state === 'play') {
    player.vel.x = (mouseX - player.x) * 0.1;
    player.vel.y = (mouseY - player.y) * 0.1;

    if (player.overlaps(item)) {
      score++;
      item.x = random(10, 490);
      item.y = random(10, 390);
    }

    text(`Score: ${score} / ${goal}`, 10, 20);

    if (score >= goal) state = 'win';
  }

  if (state === 'win') {
    textSize(36);
    text('YOU WIN!', 160, 160);
    textSize(20);
    text(`Final Score: ${score}`, 170, 210);
    text('Press R to play again', 150, 260);
  }
}
```

## Step 2 — Show play stats on the win screen

Capture stats when the win triggers: save the elapsed time so the win screen can show how long it took.

```js live
let state, score, goal, startTime, finalTime, player, item;

function setup() {
  new Canvas(500, 400);
  state = 'play';
  score = 0;
  goal = 10;
  startTime = millis();
  player = new Sprite(250, 200, 30, 30);
  player.color = '#50fa7b';
  item = new Sprite(random(10, 490), random(10, 390), 20, 20);
  item.color = '#f1fa8c';
}

function draw() {
  background('#222');

  if (state === 'play') {
    player.vel.x = (mouseX - player.x) * 0.1;
    player.vel.y = (mouseY - player.y) * 0.1;

    if (player.overlaps(item)) {
      score++;
      item.x = random(10, 490);
      item.y = random(10, 390);
    }

    text(`Score: ${score} / ${goal}`, 10, 20);
    text(`Time: ${nf((millis() - startTime) / 1000, 0, 1)}s`, 10, 40);

    if (score >= goal) {
      finalTime = (millis() - startTime) / 1000;
      state = 'win';
    }
  }

  if (state === 'win') {
    textSize(36);
    text('YOU WIN!', 160, 130);
    textSize(20);
    text(`Final Score: ${score}`, 170, 180);
    text(`Time: ${nf(finalTime, 0, 1)} seconds`, 160, 220);
    text('Press R to play again', 150, 280);

    if (kb.pressing('r')) {
      state = 'play';
      score = 0;
      startTime = millis();
    }
  }
}
```

## Step 3 — Win screen vs Game Over screen

Add a game over condition (a timer that runs out). Now you have two distinct end states: win and game over. They look different and give the player different messages — but both offer a restart.

```js live
let state, score, goal, startTime, timeLeft, finalTime, player, item;

function setup() {
  new Canvas(500, 400);
  state = 'play';
  score = 0;
  goal = 10;
  timeLeft = 15;
  startTime = millis();
  player = new Sprite(250, 200, 30, 30);
  player.color = '#50fa7b';
  item = new Sprite(random(10, 490), random(10, 390), 20, 20);
  item.color = '#f1fa8c';
}

function draw() {
  background('#222');

  if (state === 'play') {
    player.vel.x = (mouseX - player.x) * 0.1;
    player.vel.y = (mouseY - player.y) * 0.1;

    if (player.overlaps(item)) {
      score++;
      item.x = random(10, 490);
      item.y = random(10, 390);
    }

    timeLeft = 15 - (millis() - startTime) / 1000;

    text(`Score: ${score} / ${goal}`, 10, 20);
    text(`Time: ${nf(max(timeLeft,0), 0, 1)}s`, 10, 40);

    if (score >= goal) {
      finalTime = (millis() - startTime) / 1000;
      state = 'win';
    }
    if (timeLeft <= 0) state = 'gameover';
  }

  if (state === 'win') {
    textSize(36);
    text('YOU WIN!', 160, 130);
    textSize(20);
    text(`Final Score: ${score}`, 170, 180);
    text(`Time: ${nf(finalTime, 0, 1)} seconds`, 160, 220);
    text('Press R to play again', 150, 280);
  }

  if (state === 'gameover') {
    textSize(36);
    text('GAME OVER', 140, 130);
    textSize(20);
    text(`Time ran out!`, 180, 180);
    text(`Final Score: ${score} / ${goal}`, 150, 220);
    text('Press R to try again', 170, 280);
  }

  if (state === 'win' || state === 'gameover') {
    if (kb.pressing('r')) {
      state = 'play';
      score = 0;
      startTime = millis();
    }
  }
}
```

## Key takeaways

- Win is a **separate state** from game over — each draws different messages and meaning.
- Capture stats **at the moment of transition** (e.g. `finalTime = ...` before `state = 'win'`).
- Both end states can share a restart check — check `kb.pressing('r')` once for both.
- Reset **all relevant variables** on restart: score, timer, positions.
- The win screen is the **reward** — make it feel different from the game over screen.
