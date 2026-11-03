## Random numbers and timers

**Read before `5.2.2 Worked Example: Sparkles on a beat`.** About 10 minutes.

By the end of this reading you should be able to answer:

- Why does `random(6)` hand back `4.1827...` and not `4`?
- How do you ask for a whole number from 1 to 6?
- How does a game do something every half second, or once after five seconds?
- Why can `if (frameCount === 300)` sometimes never run?

Two small tools are about to turn up in every game from here on: a number the computer picks for you, and a clock made of frames.

### A random number

`random(max)` gives a different number every time you ask. It starts at 0 and goes up to, but never quite reaches, `max`:

```js
random(6)       // 4.1827...  then 0.3391...  then 5.9702...
random(20, 380) // 211.54...  a number from 20 up to (not including) 380
```

With two numbers, `random(min, max)` starts at `min` instead of 0.

**Where the decimals come from.** The computer picks any point on the number line between the two ends, so most answers have a long tail of digits. A sprite does not mind: `x = 211.54` is a fine place to stand. But sometimes you need a whole number: a die roll, a column in a grid, a spot in a list.

**`floor` cuts the decimals off.** `floor(4.1827)` is `4`. It always rounds down. If you remember a line with `Math.random()` and `Math.floor()` in the loops unit's card example, which you only read and never wrote, `random` and `floor` are the same two tools with shorter names. If you do not remember it, nothing is missing: this page is where they are taught.

```js
floor(random(6))   // 0, 1, 2, 3, 4 or 5
```

`random(6)` never reaches 6, so `floor` of it never reaches 6 either. That is six possible answers, starting from 0.

### A whole number in a range

Say what the smallest and the biggest answer should be. The biggest answer is **not** the top number you give `random`, it is one less, because the top is never reached:

| You want | Write |
| --- | --- |
| 0 to 5 | `floor(random(6))` |
| 1 to 6 (a die) | `floor(random(1, 7))` |
| 10 to 19 | `floor(random(10, 20))` |

The rule: for whole numbers from `low` to `high`, write `floor(random(low, high + 1))`.

### A random spot and a random colour

A sprite's position is just two numbers, so give it two random ones. Keep them away from the edges by about half the sprite's width, or part of the sprite hangs off the canvas:

```js
coin.x = random(30, 370);   // canvas is 400 wide
coin.y = random(30, 270);   // canvas is 300 tall
```

A colour is not a number, but a list position is. Put the colours in an array, pick a random position, and read that item out:

```js
const colors = ['tomato', 'gold', 'deepskyblue'];
const pick = floor(random(colors.length));
coin.color = colors[pick];
```

`colors.length` is `3`, so `floor(random(3))` is `0`, `1` or `2`, which are exactly the three positions. Add a fourth colour to the list and the same lines still work, because `.length` grew with it.

**One line, one number.** `const pick = floor(random(3));` asks once and keeps the answer. `pick` does not change until that line runs again. If you want a new colour every time, the line has to run every time.

**One moSHion detail.** Every call gives a new number, but each press of Run starts the sketch over, and `random` starts over with it. So the first number you get is the same on every Run, and so is the second. Press Run twice without changing anything and you get the same "random" result both times, which makes a bug easy to repeat. To see lots of different values, make the line run many times in one Run, which is what the timers below are for.

### A timer is a frame count

moSHion runs `draw()` about 60 times every second. `frameCount` is the number of times it has run: `1` on the first frame, `2` on the second, and so on. You saw it move a sprite in 5.1.22. It is also a clock.

| Frames | About how long |
| --- | --- |
| 30 | half a second |
| 60 | 1 second |
| 300 | 5 seconds |

To turn seconds into frames, multiply by 60.

### A repeating beat

The remainder operator `%` (the leftover after dividing, from Unit 1: `10 % 3` is `1`) turns an ever-growing count into a loop. `frameCount % 30` counts `1, 2, 3 ... 29, 0, 1, 2 ...` and is `0` on every 30th frame:

```js
if (frameCount % 30 === 0) {
  // runs on frame 30, 60, 90, 120 ... twice a second
}
```

The number after `%` is the gap between beats. Bigger is slower: `% 60` ticks once a second, `% 10` six times a second.

### A one-shot

`frameCount` goes up and never comes back down, so it equals `300` on exactly one frame. A test for that one frame fires exactly once:

```js
if (frameCount === 300) {
  console.log('five seconds are up');
}
```

Nothing has to be remembered or switched off afterwards. The moment is simply over.

### The mistake: a one-shot that is never asked

A one-shot only works if the code actually **looks** on the frame the count arrives. Put the test inside another `if` and it is only looked at on frames when that outer `if` is true:

```js
if (ball.y > 200) {
  if (frameCount === 300) {
    console.log('five seconds are up');
  }
}
```

If the ball is above 200 on frame 300, the inner line is skipped. On frame 301 the count has moved on, so the test is false for ever. The same happens with `ball.y > 200 && frameCount === 300`: both halves have to be true on the same frame.

The repair is to give the timer the outside, and ask the other question inside it, on the one frame that matters:

```js
if (frameCount === 300) {
  if (ball.y > 200) {
    console.log('five seconds are up, and the ball is low');
  }
}
```

If a timer "never goes off", look for an `if` wrapped around it.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **random(max)** | a random number from 0 up to, but not including, `max` |
| **random(min, max)** | a random number from `min` up to, but not including, `max` |
| **floor(n)** | `n` with its decimals cut off, rounded down: `floor(4.9)` is `4` |
| **frameCount** | how many frames have run since the game began; about 60 a second |
| **beat** | `frameCount % N === 0`: true on every Nth frame |
| **one-shot** | `frameCount === N`: true on one frame only |
