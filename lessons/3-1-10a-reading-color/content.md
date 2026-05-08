# Color in 3D

Every shPlay shape has a `.color` setter that works the same way as in q5play:

```js
cube.color = 'gold';          // named color
cube.color = '#ff6347';       // hex color (tomato red)
cube.color = 'deepskyblue';   // another named color
```

## Named colors available

A selection of useful names: `white`, `black`, `red`, `green`, `blue`, `yellow`, `cyan`, `magenta`, `gray`, `orange`, `purple`, `pink`, `tomato`, `deepskyblue`, `hotpink`, `limegreen`, `gold`, `saddlebrown`, `crimson`, `brown`.

These come from the shPlay color list — it covers the most useful web colors. If a name is not in the list, the color defaults to white.

## Hex colors

Any 6-digit hex color works: `'#ff0000'` (red), `'#00ff00'` (green), `'#1a1a2e'` (dark navy). The `#` prefix is required.

## Setting color after creation

You can set color any time — in setup() right after creating a shape, or inside draw() to change it per frame:

```js
// In draw() — changes color each frame based on some condition:
if (cube.position.x > 2) {
  cube.color = 'crimson';
} else {
  cube.color = 'gold';
}
```

## Under the hood

`.color` sets the material color on the 3D mesh. The material uses standard lighting so the same color looks slightly different depending on the scene lighting. Dark scenes with `background('#000')` show the color clearly against the background.
