// 2.5.12 A16.1 Persistent High Scores — bolt persistent top-3 scores onto your W15 game.

let score;
let highScores;

function setup() {
  // STEP 1: Load any previously saved high scores from storage using getItem.
  // If nothing has been saved yet, start with an empty array.
  // Remember: getItem always returns a string, so you will need JSON.parse to turn it back into an array.

  // STEP 2: Serialize your scores array to JSON and write it to storage using storeItem.
  // Use JSON.stringify on the array, then pass the result to storeItem.
  // (You will call this again later whenever the list changes, but set it up here first.)
}

function draw() {
  // STEP 3: Read the saved high-score values back as numbers.
  // When you retrieve individual score values, wrap getItem in Number(...) or parseInt(...)
  // so arithmetic works correctly instead of concatenating strings.

  // STEP 4: If the current score qualifies for the top 3, add it to the list and save.
  // Inside an if-block that checks score against the stored values, call storeItem
  // to write the updated JSON array back to storage.

  // STEP 5: Give the player a clear button.
  // When a key is pressed (e.g. kb.presses('c')), call clearStorage() or
  // removeItem('highScores') to wipe the saved scores so you can demo a fresh start.

  // STEP 6: Clear the background each frame so previous frames do not pile up.
  // Call background(...) here — this should already be in your W15 game.
}
