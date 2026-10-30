## Make it yours

Your game is complete: a table, a goal, a score that counts events, an end, and a restart. Now change one rule of your own choosing. Pick any one of these, or several, or invent your own.

**Challenge 1 — a second goal (easy).**
Add a second goal worth more than the first, and call it anything you like. Give each goal its own value, the same way the bumpers in 5.3.8 each had a `worth`, and give the new goal its own remembered last frame, just as each bumper had its own `wasTouching`. Watch a drop first and put the new goal where the ball really goes, or it will never be hit.

**Challenge 2 — a bumper that slides (medium).**
Add a short bumper that slides left and right across the table. Keep it `'static'`, so gravity leaves it alone, and move it yourself: in `draw()`, change its `x` a little every frame, then turn it round when it reaches an edge by flipping the sign of the step.

```js
// next to the other variables, outside setup() and draw():
let slider;
let slideStep = 2;

// in setup():
slider = new Sprite(200, 230, 60, 12, 'static');
slider.color = 'purple';

// in draw():
slider.x += slideStep;
if (slider.x > 330 || slider.x < 70) slideStep = -slideStep;
```

`slideStep = -slideStep` turns 2 into -2 and -2 back into 2, so the bumper goes right, then left, then right again.

**Challenge 3 — your best score (hard).**
A restart wipes the score, which is right. But the best score should survive it. Keep a second variable that is *not* reset when R is pressed, update it when the score beats it, and show it beside the current score.

Whatever you pick, the game must still be playable from a fresh start: press R and everything that belongs to a round goes back.

**Then name your rule.** Write one sentence as a `//` comment at the very top of your code: what your rule is, and what would happen if you removed it. For example: `// The orange goal is worth 5; without it every round scores 1.`
