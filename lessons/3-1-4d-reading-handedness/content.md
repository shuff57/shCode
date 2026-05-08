# Handedness and the Right-Hand Rule

shPlay (like three.js) uses a **right-handed coordinate system**. Here is how to remember which way each axis points using your right hand:

## The right-hand rule

1. Point your **index finger** in the direction of +X (to the right).
2. Curl your **middle finger** upward toward +Y (up).
3. Your **thumb** now points toward you — that is **+Z**.

Try it now. Hold your right hand up and do it. Your thumb should be pointing out of the screen toward you, which matches: positive Z comes toward the viewer.

## Why does this matter?

The right-hand rule also governs which direction a *positive rotation* turns a shape.

If you wrap the fingers of your right hand around an axis with your thumb pointing in the positive direction, your fingers curl in the direction of a positive rotation:

- Rotating on **Y** (thumb up): positive angle turns counterclockwise when viewed from above.
- Rotating on **X** (thumb right): positive angle tips the top of the shape away from you.
- Rotating on **Z** (thumb toward you): positive angle turns counterclockwise when viewed from the front.

## In practice

You rarely need to memorize the rotation directions — you will feel them in the labs. The main takeaway: shPlay uses a right-handed system, which is the same convention as three.js, OpenGL, and most math textbooks. If you ever use a different engine, check which hand it uses.
