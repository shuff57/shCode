# The Y Axis

**This is the one that trips everyone up.**

In 2D screens, Y increases *downward* — `y = 0` is the top, `y = 400` is the bottom. In shPlay's 3D world, it is the opposite:

```
       +Y
        |
        |   (up)
        |
 ———————0———————
        |
        |   (down)
        |
       -Y
```

- **Positive Y** moves a shape **up**.
- **Negative Y** moves a shape **down**.
- Y = 0 is at the "ground level" of the scene.

## Why the flip?

3D graphics follows the mathematical convention where Y is "height" — like a real-world vertical axis. 2D screens inherited an upside-down convention from old cathode-ray tubes that scanned top-to-bottom.

## The camera reminder

The default camera sits at `(0, 3, 7)`. That `y = 3` means the camera is 3 units *above* the origin, looking slightly downward. So shapes at `y = 0` appear below center; shapes at `y = 1` or `y = 2` appear in a more central part of the view.

## Example

```js
cube.position.y = 2;   // floats two units above ground
cube.position.y = -1;  // sinks below the origin
```

Repeat after me: **positive Y goes UP**.
