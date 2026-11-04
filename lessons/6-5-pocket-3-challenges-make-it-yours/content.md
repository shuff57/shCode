## Make it yours

Pick one, or all three. None is required, and none is graded.

1. **A second pocket.** Build the pocket from data: a `pockets` array of positions, a loop that
   makes one sprite per position, and the same slow-drop rule for each. Sinking either one wins.
2. **A sand patch.** A `'none'` sprite in the middle of the table. While the ball overlaps it,
   raise its drag (say 0.08); outside it, put it back. The ball should visibly die in the sand.
3. **A scratch.** If the cue ball goes in the same pocket, it costs a shot and the ball comes
   back to the start: `shots += 1`, then reset the position and set `sunk = false`.
