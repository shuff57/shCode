**Goal:** Build a title screen that checks for a save on startup and only shows "Continue" when one exists.

## Step 1: Create a title screen

Before any game logic, draw a title. Use arrow keys to move between "New Game" and "Continue" options.

```js live
let selectedOption = 'new';

function setup() {
  new Canvas(400, 300);
}

function draw() {
  background('#222');

  // Title
  fill('#ff79c6');
  textSize(32);
  text('My Game', 120, 80);

  // Menu options
  textSize(20);
  if (kb.presses('up') || kb.presses('down')) {
    selectedOption = selectedOption === 'new' ? 'continue': 'new';
  }

  fill(selectedOption === 'new' ? '#50fa7b': '#6272a4');
  text('New Game', 150, 160);

  fill(selectedOption === 'continue' ? '#50fa7b': '#6272a4');
  text('Continue', 150, 190);

  fill('#8be9fd');
  textSize(12);
  text('Arrow keys to choose | Enter to select', 100, 230);
}
```

## Step 2: Check for an existing save in setup()

Use `getItem('saveSlot1')` in `setup()`. Store the result in a variable. Only show "Continue" if a save exists.

```js live
let hasSave = false;
let selectedOption = 'new';

function setup() {
  new Canvas(400, 300);
  if (getItem('saveSlot1') !== null) {
    hasSave = true;
  }
}

function draw() {
  background('#222');

  fill('#ff79c6');
  textSize(32);
  text('My Game', 120, 80);

  textSize(20);

  // Only allow toggling to Continue if a save exists
  if (hasSave && kb.presses('up')) selectedOption = 'continue';
  if (kb.presses('down')) selectedOption = 'new';

  // If save was deleted, force selection back to new
  if (!hasSave && selectedOption === 'continue') selectedOption = 'new';

  fill(selectedOption === 'new' ? '#50fa7b': '#6272a4');
  text('New Game', 150, 160);

  if (hasSave) {
    fill(selectedOption === 'continue' ? '#50fa7b': '#6272a4');
    text('Continue', 150, 190);
  } else {
    fill('#44475a');
    text('Continue (no save)', 150, 190);
  }

  fill('#8be9fd');
  textSize(12);
  text('Arrow keys to choose | Enter to select', 100, 240);
}
```

Because there's no save yet, "Continue" is grayed out and you can't select it. That's the correct behavior.

## Step 3: Wire up Enter to start or continue

When the player presses Enter, either start a new game or load the save.

```js live
let hasSave = false;
let selectedOption = 'new';
let gameStarted = false;
let score = 0;
let player;

function setup() {
  new Canvas(400, 300);
  if (getItem('saveSlot1') !== null) {
    hasSave = true;
  }
}

function draw() {
  background('#222');

  if (!gameStarted) {
    drawTitleScreen();
  } else {
    drawGame();
  }
}

function drawTitleScreen() {
  fill('#ff79c6');
  textSize(32);
  text('My Game', 120, 80);

  textSize(20);

  if (hasSave && kb.presses('up')) selectedOption = 'continue';
  if (kb.presses('down')) selectedOption = 'new';
  if (!hasSave && selectedOption === 'continue') selectedOption = 'new';

  if (kb.presses('enter')) {
    if (selectedOption === 'continue' && hasSave) {
      loadSave();
    }
    gameStarted = true;
    if (selectedOption === 'new') {
      score = 0;
    }
  }

  fill(selectedOption === 'new' ? '#50fa7b': '#6272a4');
  text('New Game', 150, 160);

  fill(hasSave ? (selectedOption === 'continue' ? '#50fa7b': '#6272a4'): '#44475a');
  text(hasSave ? 'Continue': 'Continue (no save)', 150, 190);

  fill('#8be9fd');
  textSize(12);
  text('Arrow keys to choose | Enter to select', 100, 240);
}

function drawGame() {
  fill('white');
  textSize(16);
  text('Game running! Score: ' + score, 10, 25);

  if (kb.presses('space')) {
    score = score + 1;
  }

  if (kb.presses('s')) {
    storeItem('saveSlot1', JSON.stringify({ score: score }));
    hasSave = true;
    fill('#50fa7b');
    textSize(12);
    text('Saved!', 10, 50);
  }

  if (kb.presses('escape')) {
    gameStarted = false;
  }
}

function loadSave() {
  let raw = getItem('saveSlot1');
  if (raw !== null) {
    let data = JSON.parse(raw);
    score = data.score;
  }
}
```

Press Enter on "New Game" to start fresh (score = 0). Press S to save. Press Escape to return to the title screen. Now "Continue" is selectable: press Enter on it to restore your saved score.

## Key takeaways

- **Check in `setup()`**: `getItem` runs once at startup. Store whether a save exists in a variable.
- **Conditional UI**, only show "Continue" (and let the player select it) when `hasSave` is true.
- **Load on selection**: when the player chooses Continue, call `JSON.parse(getItem(key))` and apply the data.
- **New Game resets**: start with default values (score = 0), don't touch storage until the player saves.
