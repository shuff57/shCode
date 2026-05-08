# The Z Axis

Z is the **depth** axis — it points toward and away from the viewer.

```
        you (viewer)
            |
            |  +Z (toward you)
            |
            0   ← origin
            |
            |  -Z (into the scene, away from you)
            |
```

- **Positive Z** moves a shape **toward** you (closer to the camera).
- **Negative Z** moves a shape **away** from you (deeper into the scene).
- Z = 0 is the default depth of the origin.

## The camera reminder

The default camera sits at `z = 7`, looking toward `z = 0`. This means:
- Shapes at `z = 0` are 7 units in front of the camera — the default position.
- Shapes at `z = 3` are only 4 units away — they appear larger.
- Shapes at `z = -4` are 11 units away — they appear smaller.

## Example

```js
cube.position.z = 2;   // closer to the camera, appears larger
cube.position.z = -3;  // deeper into the scene, appears smaller
```

## Quick recap so far

| Axis | Positive direction | Negative direction |
|------|-------------------|-------------------|
| X    | Right             | Left              |
| Y    | Up                | Down              |
| Z    | Toward viewer     | Away from viewer  |

Z is the new one. The sandbox in the next lesson lets you feel all three at once.
