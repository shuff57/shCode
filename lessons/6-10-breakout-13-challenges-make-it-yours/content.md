## Make it yours

Your Breakout is complete: a paddle you steer with the mouse or the keys, a ball that bounces off three walls and steers off the paddle, a wall read from rows of text, bricks hit by the ball's edges, three lives, and a title screen. Now change one rule of your own choosing. The editor starts from the finished game.

**Challenge 1: a third mode (easy).**
Add `Press 3 for one ball, with the mouse` to the title screen, under the two `Press` lines in `drawTop()`: `text('Press 3 for one ball, with the mouse', 27, 290);`. In `pickMode()`, key 3 sets `control` to `'mouse'`, `lives` to 1 and `state` to `'play'`.

**Challenge 2: two-hit bricks (medium).**
Write `'2'` in `WALL` for a brick that takes two hits. `makeBricks()` pushes 2 for it, `hitAt` lowers a cell by 1 instead of setting it to 0, `drawBricks()` fills a 2 with `'silver'`, and the three `=== 1` tests (`drawBricks`, `hitAt`, `bricksLeft`) become `> 0`.

**Challenge 3: a second wall (hard).**
Make `WALLS` a list of walls and `wallNum` the one in play, as 6.9.8 did with levels. `startGame()` sets `wallNum` to 0 above `bricks = makeBricks();`, because `makeBricks()` reads `WALLS[wallNum]`. A cleared wall adds 1 to `wallNum` and builds the next one; after the last wall, the state becomes `'won'`.

Whatever you pick, play it to the end and press R afterwards (click the canvas first so the sketch hears your keys): check the game comes back whole.
