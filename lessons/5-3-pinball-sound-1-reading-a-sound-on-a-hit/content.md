## A sound on a hit

**Read before `5.6.2 Lab: A chime on every bumper hit`.** About 8 minutes.

By the end of this reading you should be able to answer:

- How does a sketch get a sound, and why is it loaded in `setup()`?
- What do `.play()` and `.volume` do?
- Where does `.play()` go, so a hit gives one chime and not a buzz?
- Why can a sketch stay silent until you click it?

**A sound is a file the sketch downloads.** `loadSound(path)` starts downloading a sound file and hands you back a sound straight away. Keep it in a variable made with `let` at the top of the file, the way you keep a sprite (5.1.8). The course has a short chime at this path, typed exactly, quotes included:

```js
chime = loadSound('/moshion/assets/coin.wav');
```

A misspelled path shows no error. The sound just never plays, so when a sketch stays silent, check the path letter by letter.

**Load once, in `setup()`. Play later.** The file takes a moment to arrive, and a `.play()` that comes before it has arrived does nothing at all: no sound and no error. So a sound is loaded once, in `setup()`, and played later, when something happens. A `loadSound` in `draw()` would start a new download 60 times a second, and none of them would be ready in time to play.

Write it as `chime = loadSound(...)`, with no `let` in front, the way `player = new Sprite(...)` is written in 5.1.8. The `let chime;` at the top already made the variable. A `let` inside `setup()` would make a second `chime` that only `setup()` can see.

**`.play()` plays it once, from the start.** `chime.play();` plays one copy of the sound. Every call starts a fresh copy, so two calls close together give two chimes on top of each other.

**`.volume` sets how loud.** It runs from `0` (silent) to `1` (full, which is where every sound starts). You set it the way you set a sprite's `color`: `chime.volume = 0.5;` is half as loud. moSHion keeps it between 0 and 1 for you.

**Where `.play()` goes: the hit, not the touch.** This is 5.4.1 again, now for your ears. `colliding()` is true on every frame the ball touches a bumper, so a `.play()` under `if (ball.colliding(bumper))` starts a new chime about 60 times a second for as long as they touch: a buzz, not a ding. A `.play()` straight in `draw()` buzzes all the time. The chime goes where the score goes: inside the `if` that is true only on the frame a touch **starts**, `touching && !wasTouching` (5.4.3). Then each hit gives exactly one chime.

**The browser's rule: click first.** Most browsers will not let a web page make a sound until the person using it has clicked on it or pressed a key on it, so the page knows someone is there. moSHion switches sound on the first time you click the game or press a key in it; you write nothing for that. Whether your click on **Run** already counts depends on the browser. So if a sketch is silent at first: click the game, make the event happen again (here, press R to drop the ball again), and listen. Still nothing? Check the path, then check that the browser tab and your speakers are not muted.

**Try it:** one bumper and a ball, with a chime on every hit. Click the canvas, then press R.

```js live
let ball, bumper, chime, wasTouching;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  bumper = new Sprite(200, 200, 240, 14, 'static');
  bumper.color = 'sienna';
  bumper.rotation = 12;

  ball = new Sprite(140, 30, 22);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.6;

  chime = loadSound('/moshion/assets/coin.wav');
  chime.volume = 0.5;
  wasTouching = false;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('click here, then press R to drop the ball', 20, 26);

  const touching = ball.colliding(bumper);
  if (touching && !wasTouching) {
    chime.play();
  }
  wasTouching = touching;

  if (kb.presses('r')) {
    ball.x = 140;
    ball.y = 30;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
```

**What you'll hear:** a chime each time the ball lands on the bar. Because it is bouncy, it lands, bounces and lands again, and each landing is a new touch, so each one chimes (the same reason each bounce scored in 5.4.2). Then it rolls off the low end and the table goes quiet until you press R.

**Try this:** change `chime.volume = 0.5;` to `0.1`, then to `1`, and run each one. Then change `ball.bounciness = 0.6;` to `0` and run it: the ball lands once and rolls, so each drop gives one chime.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`loadSound(path)`** | Starts downloading a sound file and gives back a sound. Called once, in `setup()`. |
| **`.play()`** | Plays one copy of the sound from the start. Each call is a new copy. |
| **`.volume`** | How loud this sound is, from `0` (silent) to `1` (full). |
| **`'/moshion/assets/coin.wav'`** | The course's short chime. A misspelled path never plays and shows no error. |
