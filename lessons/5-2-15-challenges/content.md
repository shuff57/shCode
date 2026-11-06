## Challenge 1: Second Goal (medium)

The starter is the one-goal scene from 5.2.23, so press Run first and touch the goal once. Then add a second goal sprite somewhere harder to reach: up in the wind zone (`y` less than `200`), which the player only gets to by jumping, is a good spot. Put it straight above the first goal, for example at `x = 360`, `y = 120`, and jump from where the first goal was. Track how many goals have been collected. Only print `"All goals collected!"` once BOTH goals are gone, not after the first one.

**How it should work:**

```js
let goal1, goal2;
let collected = 0;

// when a goal's distance check passes:
//   goal1.delete();
//   goal1 = null;
//   collected += 1;

// later, once collected reaches 2:
//   console.log('All goals collected!');
```

Keep the manual, per-goal style from this module's lessons: two separate goal variables (or a small counter). Don't try to put the goals in a list of objects here; that comes later in the course, once you have classes.

**Hints:**
- A counter variable that starts at `0` and increments each time a goal is deleted works well.
- Check the counter (`=== 2`) before printing the final message, and guard it the same single-fire way you guarded the first goal in 5.2.23.
- Give the counter a "used up" state (like bumping it past 2) so the message can't print twice either.

---

## If you finish

- Compare notes with a classmate: did you use two variables or a counter? Both are valid: what tradeoff did each choice make?
