## Two removals

A stone that leaves the screen is still in `shots` until you take it out. `delete()` removes the
**sprite**; `splice(i, 1)` removes the **array entry**. You need both.

```js
for (let i = shots.length - 1; i >= 0; i--) {
  const s = shots[i];
  if (s.x < -20 || s.x > width + 20 || s.y > height + 20) {
    s.delete();
    shots.splice(i, 1);
  }
}
```

**Backwards, always.** Splicing moves every later entry down one place, so a forward loop steps
over the next stone. That is the same reason 5.4's pipe loop ran backwards.

**A deleted sprite stays in the list** until you splice it: its `.removed` is true, but it is still
an entry. A list that grows for ever is the tell.
