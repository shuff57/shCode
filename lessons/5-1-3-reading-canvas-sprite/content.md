## Frame loop: `setup()` and `draw()`

**Read before `2.1.3a Reading: Canvas`.** About 3 minutes.

By the end of this reading you should be able to answer:

- Which of `setup()` and `draw()` runs once? Which runs every frame?
- About how many times does `draw()` run in one second?

You don't call `setup()` or `draw()` yourself. You **define** them, and moSHion calls them on a schedule.

**What you'll learn from it:**

- `setup()` is called once, the moment the sketch starts.
- `draw()` is called every frame, about 60 times per second, forever.
- Code that should run once (open a canvas, build sprites) goes in `setup()`; code that should run every frame (clear the screen, check input) goes in `draw()`.

**Try it:**

```js live
let frames = 0;

function setup() {
  new Canvas(360, 160);
  console.log('setup ran');
}

function draw() {
  background('#222');
  frames = frames + 1;
  fill('white');
  textSize(20);
  text('frames: ' + frames, 20, 90);
}
```

**What you'll see:** the canvas appears, `setup ran` prints **once** in the on-canvas console, then on the canvas you'll see `frames: 1`, `frames: 2`, `frames: 3` … climbing by about 60 each second.

**Try this:** stop and restart the sketch. Notice `setup ran` prints once *each time you start*, while `frames` resets to 0 and climbs again. That's the schedule: `setup()` once per start, `draw()` every frame after.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`setup()`** | Function you define. Engine calls it once at start. |
| **`draw()`** | Function you define. Engine calls it every frame. |
| **Frame** | One run of `draw()`. moSHion does ~60 of them per second. |
| **Frame rate** | Frames per second (fps). moSHion targets 60. |
