## Make it yours

Pick one, or all three. None is required, and none is graded.

1. **Wind.** On each round, pick a random force: `wind = random(-3, 3)`. In `draw()`, apply it to
   every shot: `for (const s of shots) s.applyForce(wind, 0);`. Show the wind as a number, so the
   player can aim into it.
2. **A second stone after a pause.** Give the player one reload: on a key of your choice,
   `after(60, () => { shotsLeft += 1; })` so the extra stone arrives a second later.
   `after(frames, fn)` runs `fn` once, that many frames later (60 frames is about a second).
   Put the call in the key's `if`, not loose in `draw()`, or you start a new timer every frame.
3. **A stone block.** Make one block out of stone: `hits = 3`, `mass = 6`, a grey colour. The
   same hit loop already handles it; tune the numbers until it feels heavy.
