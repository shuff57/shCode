## Stretch Challenges: Joints Beyond the Main Flow

Pick **one**. Finish A17.1 first, then try this if you want to push further. Show your teacher when it runs.

---

### Challenge 1: SliderJoint Sandbox

A `SliderJoint` constrains two sprites to slide along a single axis, like a piston rod or a sliding door. This joint type doesn't appear in the main unit flow; this challenge is where it lives.

Create a static anchor and a dynamic sprite. Connect them with `new SliderJoint(anchor, piston)`. Then see what makes the piston move: gravity? `applyForce`? Can you add a second slider on the opposite axis? Can you drive the piston back and forth with a keypress?

**API hint:** The constructor takes two sprite arguments: `new SliderJoint(spriteA, spriteB)`: exactly like `DistanceJoint` and `HingeJoint`. Set `spriteA.collider = 'static'` for the anchor. The piston slides along the axis defined by the two sprites' initial positions.

**Where to look:** 2.7.12 (DistanceJoint reading) and 2.7.17 (applyForce reading) cover the sibling APIs. The pattern is the same; only the constraint type changes.

---

### Challenge 2: Trebuchet

A trebuchet is a sling machine: a long arm pivots on a hinge, one end heavy (counterweight), one end carrying a projectile on a length of rope. When released, the arm swings and the rope whips the projectile forward.

Build a simplified version: a pivot sprite (`collider = 'static'`), an arm sprite connected by a `HingeJoint`, and a projectile connected to the arm's far end by a `DistanceJoint`. Set gravity, give the counterweight end more mass (make it bigger), and watch what happens. Can you release the projectile at the right moment using `joint.delete()` and `applyForce`?

**API hints:** See 2.7.14 (HingeJoint), 2.7.12 (DistanceJoint), 2.7.16 (joint.delete()), and 2.7.17 (applyForce). You'll use all four in the same sketch: that's the point.

**Stretch it further:** Add a target sprite somewhere on screen and try to aim.

---

### Challenge 3: Swinging Rope Chain

A rope is a chain of sprites, each linked to the next by a `HingeJoint`. Build one with at least three linked segments. Anchor the top segment (`collider = 'static'`), leave the rest dynamic, and watch it swing with gravity.

Try attaching a heavier sprite at the bottom. Try tugging the chain with `applyForce`. Can you make it long enough that the middle segments form a visible arc?

**API hints:** See 2.7.14 (HingeJoint). The pattern is: create sprites in a loop, connect each one to the previous with `new HingeJoint(prev, curr)`. Spacing the sprites close together (within ~30px) gives a smoother rope feel.

**Stretch it further:** Add a ball at the end and let the player swing and release it like a flail: combine `mouse.pressing()` to drag the anchor, then release with `joint.delete()` + `applyForce`.

---

### How it's graded

The auto-grader checks four things:

1. A canvas is created
2. At least one sprite is created
3. `background()` is called inside `draw()`
4. Your code contains at least one stretch joint feature: a `SliderJoint`, a combo of `DistanceJoint` + `HingeJoint` together (trebuchet), or multiple `HingeJoint` calls (rope chain)

If all four are green, you can Submit. That's it. The interesting part is what you build, not the score.
