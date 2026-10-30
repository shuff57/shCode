## A body that grows

**Read before `5.5.6 Lab: Grow and eat`.** About 8 minutes.

By the end of this reading you should be able to answer:

- Why is the snake an array of sprites rather than one sprite?
- What two array calls make it move, and which one is skipped when it eats?
- Why must a removed cell be deleted as well as popped?

**One sprite per cell.** The snake is a row of green cells, so the game keeps them in an array, the same way Flappy kept its pipes. By convention `segments[0]` is the head and the last item is the tail:

```js
let segments = [];
segments.push(makeSegment(10, 10));
segments.push(makeSegment(9, 10));
segments.push(makeSegment(8, 10));
```

**Moving a long snake without moving every cell.** The obvious way, shifting each cell into the one ahead, is slow and fiddly. There is a shorter trick. To move one step, add a new cell in front of the head and remove the cell at the tail. The middle never moves, yet the whole snake appears to slide forward:

```js
segments.unshift(makeSegment(col, row));   // a new head
const tail = segments.pop();               // take the last cell out of the array
tail.delete();                             // and off the screen
```

`unshift` adds to the **front** of an array; `push` adds to the back. `pop` removes and hands back the **last** item.

**Growing is just not removing.** When the head lands on food, skip the tail removal. A cell was added at the front and none was taken from the back, so the snake is one cell longer:

```js
if (col === food.col && row === food.row) {
  score += 1;        // ate: keep the tail
} else {
  const tail = segments.pop();
  tail.delete();     // did not eat: lose the tail
}
```

**Two places to clean up.** As with the pipes in 5.4.4, a cell lives in two places: the screen and the array. `pop` takes it out of the array; `delete()` takes it off the screen. Do only the first and the snake looks longer than it is.

**New food.** When the food is eaten, delete the old food sprite and build a new one on a random cell with `makeFood()`.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **unshift** | adds an item to the front of an array |
| **pop** | removes and returns the last item of an array |
| **head, tail** | the first and last cells of the snake |
