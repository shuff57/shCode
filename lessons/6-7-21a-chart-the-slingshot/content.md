## Plain English to Pseudocode: The Slingshot

Here is the plan in plain English:

**1.** Each frame, ask three questions in a row.

**2.** Grab: if the mouse was just pressed while over the ball, the ball is now held.

**3.** Stretch: if the ball is held and the mouse is still down, move the ball to the mouse and draw the band.

**4.** Release: if the ball is held and the mouse was let go, work out the force, apply it to the ball, and the ball is no longer held.

**5.** If nothing is being done to the ball (idle), all three answers are no and the frame just ends.

The same plan is drawn as a flow chart above the editor. You do not draw it, you read it: follow the arrows and match each box to one of the steps.

In `README.md`, type these as numbered pseudocode **between the first and last line**. Write three separate IF blocks, one per question, each closed with END IF. Number every line, including the indented ones and the END IF lines. Each keyword looks like this:

- `IF mouse presses AND ball is hovered` ... `END IF` (a question the frame asks)
- `SET held TO true` (a change)
- `CALL drawBand` (call another function)
- `SET ball position TO the mouse` (a change)

The force is applied on exactly **one** frame of the whole throw. If you put `applyForce` on the stretch path, the ball would speed up every frame you hold it.
