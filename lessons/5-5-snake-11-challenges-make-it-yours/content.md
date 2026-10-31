## Make it yours

Your game is complete: a grid, steering, a body that grows, food, a bite check, and a restart. Now change one rule of your own choosing.

**Challenge 1 — a faster snake (easy).**
The starter keeps the beat in `const BEAT = 8;` and steps on `frameCount % BEAT`. A `const` can never change, so turn it into `let beat = 8;` and use `frameCount % beat`. Make `beat` smaller every time the snake eats, with a floor so the game never becomes impossible.

**Challenge 2 — your best score (medium).**
A restart wipes the score, which is right. Keep a second variable called `best` that is *not* reset when R is pressed, update it when the score beats it, and show it beside the current score in `drawTop()`.

**Challenge 3 — the quick double-turn (hard).**
Move right, then press up and left very quickly, both within one step. The snake runs back into itself, because the second key was tested against a direction that had only just changed. Store each turn in `turnX` and `turnY`, and apply it at the start of the next step.

Whatever you pick, the game must still be playable from a fresh start: press R and everything that belongs to a round goes back.
