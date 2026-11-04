## A block has its own count

A block is a sprite with a number of hits it can take. Give it a name of your own, never
`.life` (that deletes the sprite at 0):

```js
block.hits = 2;
```

## Every shot against every block

```js
for (let j = shots.length - 1; j >= 0; j--) {
  for (const b of blocks) {
    if (shots[j].overlaps(b)) {
      b.hits -= 1;
      shots[j].delete();
      shots.splice(j, 1);
      break;
    }
  }
}
```

The shot **leaves on the frame it hits**, so it counts one hit and cannot hit the same block
again next frame. That is different from Pinball's `colliding`, where you needed a memory. Here
the removal is the memory.

## Toppling

Blocks are bodies: give them `mass` and `bounciness` and no `rotationLock`, and the wall
falls when the bottom is knocked out. Keep the bottom row static if the stack will not settle.
