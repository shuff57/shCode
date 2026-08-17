## When to reach for OOP (3-question checklist)

**Read after `5.3.29 Worked Example — Procedural vs OOP side-by-side`.** About 4 minutes.

By the end of this reading you should be able to answer:

- What three questions determine whether a class is worth writing?
- Apply the checklist to a scenario and justify your verdict.

Not every program needs a class. A class earns its complexity when three things are true simultaneously.

**What you'll learn from it:**

The decision rule is three yes-or-no questions. Three yeses → write a class. Fewer than three → a function (or a plain object) is probably enough.

1. **More than one of this thing?** If you'll only ever have one player, one config object, one timer — a plain variable or object literal is simpler. Classes shine when you need to stamp out multiple copies.
2. **Each has its own state?** If all instances would share the same data, there's nothing for `this` to hold — a set of functions and a shared variable is cleaner.
3. **Each has its own behavior tied to that state?** If the thing *does something* using its own data — like an `Enemy` that tracks its own HP and knows how to take damage — a method is the right home for that behavior.

Three yeses → class. Anything else → simpler is better.

**Try it:**

Apply the checklist to each of the four scenarios below. Predict your verdict first, then reveal the answer key.

```js live
// Scenario playground — four tiny programs, each doing one thing.
// Read each comment, ask the three questions, then run to see them work.

// (a) One player score — just a number
let score = 0;

// (b) Five spawning enemies — each with own x, y, hp
// let enemies = [ new Enemy(...), ... ]

// (c) One config object loaded once at boot
let config = { volume: 0.8, difficulty: 'normal' };

// (d) A single timer that ticks every frame
let elapsed = 0;

function setup() {
  new Canvas(360, 200);
}

function draw() {
  background('#222');
  elapsed++;
  fill('white');
  textSize(14);
  text('(a) score = ' + score, 20, 60);
  text('(c) volume = ' + config.volume, 20, 90);
  text('(d) elapsed = ' + elapsed + ' frames', 20, 120);
  if (kb.presses('space')) score += 10;
}
```

**What you'll see:** score, config value, and elapsed frames — three of the four scenarios running.

**Try this:** apply the 3-question checklist to each scenario. Scenario (b) — five enemies — is the only one that scores three yeses. For the others, identify which question fails and explain why a class isn't needed.

<details>
<summary>Answer key (open after you've tried)</summary>

- **(a) Tracking the player's score** — No class needed. One thing (Q1 fails), no per-instance state (Q2 fails).
- **(b) Five spawning enemies** — Class warranted. More than one (Q1 yes), each has HP/position (Q2 yes), each can take damage (Q3 yes).
- **(c) One configuration object loaded once** — No class needed. Only one (Q1 fails). A plain object literal is fine.
- **(d) A single timer that ticks every frame** — No class needed. Only one timer (Q1 fails). A plain variable works.

</details>

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Decision rule** | Three yes-or-no questions: multiple instances? own state? own behavior? Three yeses → class. |
| **State** | Data an instance holds that can change over time (e.g. `this.hp`). |
| **Behavior** | What an instance can *do*, expressed as methods (e.g. `damage(n)`). |
