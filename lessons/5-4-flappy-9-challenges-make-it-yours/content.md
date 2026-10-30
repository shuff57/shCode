## Make it yours

Your game is complete: a bird, a flap, pipes that come and go, a score, a crash, and a restart. Now change one rule of your own choosing.

**Challenge 1 — harder as you go (easy).**
Make the pipes faster, or the gap narrower, as the score grows. The rule reads the score, so it can live in `makePipe()` or in the loop.

**Challenge 2 — your best score (medium).**
A restart wipes the score, which is right. Keep a second variable that is *not* reset when R is pressed, update it when the score beats it, and show it beside the current score in `drawTop()`.

**Challenge 3 — a wobbling gap (hard).**
Give each pipe a little sideways wobble of its own, using `random` for how fast it wobbles. The top and the bottom half must stay in step, or the gap stops being a gap.

Whatever you pick, the game must still be playable from a fresh start: press R and everything that belongs to a round goes back.
