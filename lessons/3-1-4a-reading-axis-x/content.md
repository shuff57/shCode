# The X Axis

The X axis runs left-to-right — the same direction as the horizontal axis on a 2D screen.

```
-X <————————— 0 —————————> +X
  left                    right
```

- **Positive X** moves a shape to the **right**.
- **Negative X** moves a shape to the **left**.
- X = 0 is the center of the scene.

## Example

```js
cube.position.x = 2;   // two units to the right of center
cube.position.x = -3;  // three units to the left of center
```

## What "a unit" means

shPlay uses arbitrary units (not pixels). The default camera sits at `(0, 3, 7)` looking at the origin. From that viewpoint, one unit of X movement looks like a moderate step sideways — experiment in the sandbox coming up next.

**Good news:** X in 3D feels exactly like horizontal movement in 2D. No mental flip needed here — that comes on the Y axis.
