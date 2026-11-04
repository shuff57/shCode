## Did the shot hit?

**Read before `7.4.6 Lab: Hit the drone`.** About 8 minutes.

By the end of this reading you should be able to answer:

- What question does `overlaps()` ask, and on which frames is it true?
- Why can `colliding()` never see a shot hit the drone?
- Why must the shot leave on the very frame it hits?
- Why does the loop over the shots still run backwards?

**Something to shoot at.** The next lab adds a **drone**: one crimson square that falls from the top, 1.5 pixels a frame, moved by hand like everything else in this game. Like the shots, it has `collider = 'none'`, so the two pass through each other instead of shoving each other around.

**`overlaps()` asks about this frame.** `a.overlaps(b)` asks: do the boxes of these two sprites overlap **right now**? It answers `true` or `false`.

```js
if (bullets[i].overlaps(drone)) {
  // this shot is touching the drone on this frame
}
```

It is level-triggered, like `colliding()` in 5.4.1: true on *every* frame the two touch, not only on the first. A shot climbs 8 pixels a frame and the drone falls 1.5, so a shot that passed straight through the drone would be touching it for about four frames.

**Why not `colliding()`?** `colliding()` reports a physical contact: two solid bodies pressing against each other. A sprite with `collider = 'none'` has no body to press with, which is exactly why the shots fly through things. So `bullets[i].colliding(drone)` is never true, however squarely the shot lands. `overlaps()` does not ask the physics at all. It compares the two sprites' boxes, whatever their collider, so it sees a pass-through shot touch a pass-through drone.

| | `colliding(other)` | `overlaps(other)` |
| --- | --- | --- |
| asks | are the two bodies pressing against each other? | do the two boxes overlap? |
| with `collider = 'none'` | never true | true while they overlap |
| true on | every frame of contact | every frame of overlap |

**The shot leaves on the frame it hits.** Because `overlaps()` stays true for several frames, a hit that only adds to the score would add on every one of them: one shot, four points. So the frame a shot hits is the frame it goes, from both places, as in 5.11.2: `delete()` takes it off the screen and `splice` takes it out of the array. On the next frame there is no shot left to overlap anything.

```js
for (let i = bullets.length - 1; i >= 0; i--) {
  if (bullets[i].overlaps(drone)) {
    bullets[i].delete();
    bullets.splice(i, 1);
    score += 1;
    resetDrone();
  }
}
```

**The drone goes back to the top.** A hit drone does not vanish; it is sent back above the top of the screen at a random `x`, using `random(a, b)` from 5.2.1, and falls again:

```js
function resetDrone() {
  drone.x = random(30, 370);   // anywhere across, clear of the edges
  drone.y = -20;               // just above the top, out of sight
}
```

The same function puts it back when it reaches the base without being hit, and when a new round starts.

**Backwards, again.** The hit loop splices, so it runs from the end of `bullets` to the start for the reason 5.11.1 gave: a splice moves every later shot down one place, and counting upwards the loop would skip the shot that slid into the gap. Counting downwards, the shots still to be visited never move.

**Try it.** Move with the arrow keys and hold Space under the drone.

```js live
// Left and right move the ship. Hold Space to fire at the drone.
let ship, drone, bullets, cooldown, score;

function setup() {
  new Canvas(400, 300);
  ship = new Sprite(200, 270, 36, 18, 'static');
  ship.color = 'deepskyblue';
  drone = new Sprite(200, -20, 28, 28);
  drone.collider = 'none';
  drone.color = 'crimson';
  bullets = [];
  cooldown = 0;
  score = 0;
}

// Puts the drone back above the top of the screen at a random x.
function resetDrone() {
  drone.x = random(30, 370);
  drone.y = -20;
}

// A shot that overlaps the drone scores 1, leaves the screen and the array, and resets the drone.
function hitDrone() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].overlaps(drone)) {
      bullets[i].delete();
      bullets.splice(i, 1);
      score += 1;
      resetDrone();
    }
  }
}

function draw() {
  background('#111');

  if (kb.pressing('left')) ship.x -= 5;
  if (kb.pressing('right')) ship.x += 5;

  if (cooldown > 0) cooldown -= 1;
  if (kb.pressing('space') && cooldown === 0) {
    const b = new Sprite(ship.x, ship.y - 18, 6, 14);
    b.collider = 'none';
    b.color = 'yellow';
    bullets.push(b);
    cooldown = 12;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= 8;
    if (bullets[i].y < -20) {
      bullets[i].delete();
      bullets.splice(i, 1);
    }
  }

  drone.y += 1.5;
  if (drone.y > 320) resetDrone();

  hitDrone();
}

function drawTop() {
  fill('white');
  textSize(16);
  text('score: ' + score, 12, 24);
  text('shots alive: ' + bullets.length, 12, 46);
}
```

**What you'll see:** a shot that reaches the drone disappears, the score goes up by exactly 1, and the drone jumps back to the top somewhere new.

**Try this:**

1. In `hitDrone()`, delete the line `resetDrone();`. The drone keeps falling after a hit. Each shot that reaches it still adds 1 and vanishes, because the shot leaves on the frame it hits.
2. Now also delete the two lines that remove the shot, `bullets[i].delete();` and `bullets.splice(i, 1);`. Fire one single shot at the drone: it passes straight through, and the score jumps by about 5, once for every frame the two overlap.
3. Put all three lines back and change `overlaps` to `colliding`. Nothing ever scores: neither sprite has a body for `colliding()` to feel.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **overlaps(other)** | `true` on every frame the two sprites' boxes overlap, whatever their collider |
| **colliding(other)** | true while two solid bodies press against each other; never for `collider = 'none'` |
| **drone** | the single target of Part A: it falls, and goes back to the top when it is hit or reaches the base |
