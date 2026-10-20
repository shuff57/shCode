## Fix the Broken Pseudocode: the Pause State

Here is what the finished feature should do, in plain English:

**1.** When the state is play: update the game, and if p was pressed, change the state to paused.

**2.** When the state is not play (it is paused): draw the pause screen, and if p was pressed, change the state back to play.

**3.** Every path ends at the end of the frame. No step may send you back to itself.

The same plan is drawn as a flow chart above the editor. You do not draw it, you read it: follow the arrows and match each box to one of the steps.

Someone started this pseudocode and stopped halfway. It is already in `README.md`. **Press Run before changing anything**: four checks should be red. Then repair it, do not start over:

- Give the play decision its own **ELSE** branch, for every frame that is not playing.
- Move `CALL drawPauseScreen` into that branch so it runs only when paused.
- Remove the **GO TO**. Setting a state is an ordinary step: the frame carries on to the end.
- Inside the ELSE branch, add the way out: if p is pressed, SET state TO "play".

When it is all green, check the thing no check covers: can the player get out of pause? Green means legal, not finished.
