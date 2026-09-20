## Challenge 1: Second Goal (medium)

Add a second goal sprite somewhere harder to reach: above the wind zone is a good spot. Track how many goals have been collected. Only print `"All goals collected!"` once BOTH goals are gone, not after the first one.

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

Keep the manual, per-goal style from this module's lessons: two separate goal variables (or a small counter), not an array of goal objects. That refactor is coming later, in §5.4: don't do it here.

**Hints:**
- A counter variable that starts at `0` and increments each time a goal is deleted works well.
- Check the counter (`=== 2`) before printing the final message, and guard it the same single-fire way you guarded the first goal in 5.2.11.
- Give the counter a "used up" state (like bumping it past 2) so the message can't print twice either.

---

## If you finish

- Compare notes with a classmate: did you use two variables or a counter? Both are valid: what tradeoff did each choice make?
