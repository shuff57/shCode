## Fix the Broken Pseudocode: Dragging a Sprite

Here is what the finished feature should do, in plain English:

**1.** While the mouse is pressing: if the sprite is under the mouse, move the sprite to the mouse.

**2.** When the mouse is not pressing (it was let go): set the sprite velocity to zero, so it does not fly off.

**3.** Every path ends at the end of the frame. No step may send you back to itself.

The same plan is drawn as a flow chart above the editor. You do not draw it, you read it: follow the arrows and match each box to one of the steps.

Someone charted picking the sprite up carefully, and stopped. Their pseudocode is already in `README.md`. **Press Run before changing anything**: three checks should be red. Then repair it, do not start over:

- Give `IF mouse is pressing` an **ELSE**: the release path.
- Move `SET velocity TO zero` into that ELSE. It belongs on exactly the frames where the mouse is up.
- Remove the **GO TO**. Moving a sprite is one ordinary step per frame: the loop you are thinking of is `draw()` running again, outside this plan.

When it is green, trace this: the player presses the mouse somewhere empty, then drags across the sprite while still holding. Does your plan pick it up mid-drag? Should it?
