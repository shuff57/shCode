## Plain English to Pseudocode: The Three-State Machine

Here is the plan in plain English:

**1.** Each frame, look at which state the game is in: title, play or gameover. Only one of them runs.

**2.** In the title state: draw the title screen, then if space was pressed, change the state to play.

**3.** In the play state: update the game, then if the player is dead, change the state to gameover.

**4.** In the gameover state: draw the game-over screen, then if r was pressed, change the state to title.

**5.** Changing the state does not jump anywhere. It sets a variable, and the frame just ends.

The same plan is drawn as a flow chart above the editor. You do not draw it, you read it: follow the arrows and match each box to one of the steps.

In `README.md`, type these as numbered pseudocode **between the first and last line**. Use IF, ELSE IF and END IF for the routing (the last state is an ELSE IF too, so every state is tested by name), CALL for the three drawing and updating methods, and SET for a state change. Number every line, including the indented ones and the END IF lines. Each keyword looks like this:

- `IF state is "title"` ... `ELSE IF state is "play"` ... `END IF` (route by state)
- `CALL drawTitle` (call another function)
- `IF space is pressed` ... `END IF` (the check to leave the state)
- `SET state TO "play"` (a state change)

Every state draws **first** and only then asks whether to leave. Afterwards, read your plan as a map: is there any way from play back to title without dying? There is not, and you found it by reading. That may be fine.
