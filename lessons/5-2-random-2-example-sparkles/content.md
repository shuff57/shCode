## Sparkles on a beat

**Read before `5.2.4 Lab: A random spot and colour`.** About 7 minutes.

Run it and watch for five seconds. A new square appears at a random place, in a random colour, twice every second. At the five-second mark a message appears, one time.

```js live console
const colors = ['tomato', 'gold', 'deepskyblue', 'limegreen', 'orchid'];
let message = '';

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('seconds: ' + floor(frameCount / 60), 20, 28);
  text(message, 20, 52);

  // The beat: every 30 frames, one new square.
  if (frameCount % 30 === 0) {
    const spark = new Sprite(random(20, 380), random(70, 280), 20, 20);
    spark.color = colors[floor(random(colors.length))];
  }

  // The one-shot: on exactly frame 300, and never again.
  if (frameCount === 300) {
    message = 'Five seconds are up!';
    console.log('five seconds are up');
  }
}
```

**What you'll see:** a seconds counter ticking up in the corner. A square pops in about every half second, never in the same place twice. When the counter reaches 5, `Five seconds are up!` appears and stays, and the console under the canvas prints its line once.

**How it works, line by line.**

- `world.gravity.y = 0;` keeps off the pull that makes sprites fall. It is already `0` when a sketch starts, so the line changes nothing: it is there so a reader can see that nothing will fall. That is all you need to know about it today; gravity gets its own reading in 5.2.8. With it at `0`, each square stays where it appears.
- `frameCount % 30 === 0` is the beat. It is true on frames 30, 60, 90 and so on, so `new Sprite(...)` runs twice a second. In 5.1.8 a `new Sprite` inside `draw()` was a bug, because it ran 60 times a second by accident. Here it sits inside the beat, so it runs only when the beat says so.
- `random(20, 380)` is a decimal between 20 and 380 for the x position, and `random(70, 280)` is one for y, which keeps the squares below the text. The squares are 20 wide, so a margin of 20 keeps each one fully on the canvas.
- `floor(random(colors.length))` is a whole number from `0` to `4`: a position in the list. `colors[...]` reads the colour sitting there.
- `floor(frameCount / 60)` turns frames into whole seconds: 60 frames is 1, 300 frames is 5.
- `frameCount === 300` is true on one frame only, so the message is set once. The `message` variable holds the words from then on, which is why the text stays on screen after the moment has passed.

**Try this:**

1. Change `frameCount % 30` to `frameCount % 10`. The beat is shorter, so the squares come three times as fast.
2. Change `frameCount % 30` to `frameCount % 120`. One square every two seconds.
3. Change `random(colors.length)` to `random(2)`. Only the first two colours ever appear, because the positions can only be `0` or `1`.
4. Change `frameCount === 300` to `frameCount === 120`. The message arrives after two seconds instead of five.
5. Wrap the one-shot in `if (frameCount % 2 === 0) { ... }` and change `300` to `301`. The message never arrives: frame 301 is odd, so the outer `if` is false on the one frame the inner test needed. That is the mistake from the reading.
