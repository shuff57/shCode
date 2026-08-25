**Goal:** see the iterate-then-delete bug live, understand *why* it skips items, then apply the two safe fixes — backwards iteration and iterate-a-copy.

## Step 1 — Run the BAD version

A Group of falling apples. Every frame we check each apple and delete the ones that fell off-screen with a forward `for` loop. Watch the apples that are *supposed* to be gone pile up — some get skipped.

```js live
let apples;

function setup() {
  new Canvas(400, 400);
  apples = new Group();
  apples.color = 'red';
  apples.diameter = 20;
  apples.collider = 'none';

  for (let i = 0; i < 8; i++) {
    new apples.Sprite(40 + i * 45, 0);
  }
  for (let a of apples) a.vel.y = 4;
}

function draw() {
  background('#113311');

  // BAD — forward loop while deleting.
  for (let i = 0; i < apples.length; i++) {
    if (apples[i].pos.y > 410) apples[i].delete();
  }

  fill('white');
  textSize(16);
  text('apples remaining: ' + apples.length, 12, 24);
}
```

After all the apples have fallen past `y > 410`, you should see `apples remaining: 0` — but instead you'll see a few left over (often 2–4). They never came back into view, but the array still holds them.

## Step 2 — Why does it skip?

When `apples[2].delete()` runs, moSHion splices that sprite out of every group it belongs to — including `apples`. Everything to the right shifts down by one — what was at index `3` is now at index `2`. But the loop counter `i` keeps incrementing — next iteration is `i = 3`, which is *the sprite that used to be at index `4`*. The sprite that shifted into index `2` is never visited.

Net effect: every other doomed sprite gets skipped.

## Step 3 — Fix A: iterate backwards

Loop from `length - 1` down to `0`. When you delete an element, only indices *higher* than the current one shift — and we've already processed those.

```js live
let apples;

function setup() {
  new Canvas(400, 400);
  apples = new Group();
  apples.color = 'red';
  apples.diameter = 20;
  apples.collider = 'none';

  for (let i = 0; i < 8; i++) {
    new apples.Sprite(40 + i * 45, 0);
  }
  for (let a of apples) a.vel.y = 4;
}

function draw() {
  background('#113311');

  // GOOD — iterate backwards.
  for (let i = apples.length - 1; i >= 0; i--) {
    if (apples[i].pos.y > 410) apples[i].delete();
  }

  fill('white');
  textSize(16);
  text('apples remaining: ' + apples.length, 12, 24);
}
```

Wait until every apple has fallen — you'll now see `apples remaining: 0`. Every doomed sprite was visited.

## Step 4 — Fix B: iterate a copy

Make a shallow array copy with `[...apples]` and iterate that. The original Group can shift under us safely — the copy still holds every sprite reference.

```js live
let apples;

function setup() {
  new Canvas(400, 400);
  apples = new Group();
  apples.color = 'red';
  apples.diameter = 20;
  apples.collider = 'none';

  for (let i = 0; i < 8; i++) {
    new apples.Sprite(40 + i * 45, 0);
  }
  for (let a of apples) a.vel.y = 4;
}

function draw() {
  background('#113311');

  // GOOD — iterate a copy.
  for (let a of [...apples]) {
    if (a.pos.y > 410) a.delete();
  }

  fill('white');
  textSize(16);
  text('apples remaining: ' + apples.length, 12, 24);
}
```

Same correct behavior, more readable than the manual backwards loop.

## Key takeaways

- **Iterating forward + deleting = bugs.** Every other doomed sprite gets skipped because the array shifts under your loop counter (moSHion's `delete()` splices the sprite out of every group it's in).
- **Backwards iteration is safe** because deleted indices are always *behind* you.
- **Iterate-a-copy** (`[...group]`) is also safe and reads more cleanly — pick the style that's clearer at the call site.
- **The `overlaps(group, callback)` callback form is *also* safe** — moSHion has finished its own iteration before calling your callback. Use it when deletion is triggered by a collision (see `6.2.2 Worked Example — Apple Catcher`).
- **Pick one safe pattern per loop.** Don't mix backwards iteration and iterate-a-copy in the same block — pick whichever reads cleaner for the situation.
