## joint.delete()

Joints are not permanent. You can delete a constraint at any point during the game:

```js
joint.delete();
```

After that one call, the constraint is gone. On the very next frame, both sprites move independently — the physics engine no longer links them. They keep whatever velocity they had at the moment of removal.

To use `joint.delete()`, you need a variable that holds the joint when you create it:

```js
let joint = new DistanceJoint(anchor, ball);
```

Then later, when you want to release it:

```js
joint.delete();
```

**Try it:** a pendulum starts swinging. Press Space and the joint is deleted — the ball falls freely from wherever it was.

```js live
let anchor;
let ball;
let joint;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 5;

  anchor = new Sprite(200, 60, 20, 20);
  anchor.collider = 'static';
  anchor.color = '#6272a4';

  ball = new Sprite(320, 60, 24, 24);
  ball.color = '#ff79c6';

  joint = new DistanceJoint(anchor, ball);
}

function draw() {
  background('#282a36');

  fill('#f8f8f2');
  textSize(14);
  text('Press SPACE to cut the joint', 100, 20);

  if (kb.presses(' ')) {
    joint.delete();
  }
}
```

After you press Space, the ball is no longer tethered. It follows gravity on its own. This is the exact release step the slingshot pattern uses.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`joint.delete()`** | Deletes the constraint immediately. Both sprites become independent on the next frame. |
