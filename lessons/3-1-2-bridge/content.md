# Bridge: q5play 2D to shPlay 3D

You already know q5play. shPlay keeps everything you liked and adds one dimension. Here is the direct mapping.

## What stays exactly the same

- `setup()` runs once when the sketch starts.
- `draw()` runs every frame (~60 times per second).
- `kb.pressing('a')`, `kb.presses('space')` — identical API.
- `.color` setter — `shape.color = 'gold'` still works with named colors and hex.
- `background('#111')` — same call, clears the scene each frame.

## What changes

| q5play (2D) | shPlay (3D) | Why |
|---|---|---|
| `new Canvas(400, 400)` | _(nothing — automatic)_ | shPlay sets up the 3D canvas for you |
| `new Sprite(x, y)` | `new Cube(x, y, z)` | A third coordinate `z` (depth) is new |
| `sprite.vel.x = 4` | `shape.position.x += 0.05` | No built-in velocity; you mutate position directly |
| `sprite.rotation = 1.5` | `shape.rotation.y = 1.5` | 3D rotation has three separate axes: `.x`, `.y`, `.z` |
| Physics (gravity, bounciness) | _(opt-in, not automatic)_ | Physics is not on by default in shPlay |
| `sprite.x`, `sprite.y` | `shape.position.x`, `.y`, `.z` | Position is a sub-object, not flat properties |

## The key additions

1. **Three position coordinates:** every shape has `.position.x`, `.position.y`, `.position.z`.
2. **Three rotation axes:** `.rotation.x`, `.rotation.y`, `.rotation.z` — each in radians.
3. **Scale per axis:** `.scale.x`, `.scale.y`, `.scale.z` — or `.size` for uniform scaling.

Everything else you learned carries over. Keep reading to meet the axes one by one.
