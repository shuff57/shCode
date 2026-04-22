---
theme: default
title: "Module 2.2 — Object-Oriented Programming"
info: |
  Module 2.2: Object-Oriented Programming via q5play.
  Week 12 · Q2 · 2 class sessions.
  Covers: classes, instances, this, procedural vs OOP.
class: text-center
transition: slide-left
mdc: true
---

# Module 2.2 — Object-Oriented Programming via q5play

**Week 12 · Quarter 2 · Two sessions**

You've been using classes for two weeks. Time to see what they are.

<div class="text-sm opacity-70 mt-8">
Press <kbd>Space</kbd> or <kbd>→</kbd> to advance · <kbd>e</kbd> to open slide notes
</div>

---

# What you already know (Unit 2.1)

```js
let player = new Sprite(200, 200, 40, 40);
player.color = 'deepskyblue';
player.vel.x = 4;
```

- You've typed `new` many times — every sketch starts with it.
- You've read `.vel`, `.color`, `.pos` — dot notation is already muscle memory.

<v-click>

**Pause. Think.**

What does `new` actually do?

</v-click>

---

# The reveal: you've been using classes

`Sprite` is not a built-in keyword. It is a **class**.

`player` is not a special variable. It is an **instance**.

<v-click>

Open DevTools and try this:

```js
> player.constructor.name
"Sprite"
```

`player.constructor.name === 'Sprite'` — the engine just told you what it is.

</v-click>

<v-click>

Every q5play primitive — `Sprite`, `Canvas`, `Group` — is an instance of a class.
This week you write your own.

</v-click>

---

# In DevTools — live demo

Open DevTools with **F12** and run a sketch that has a `player` sprite.

```js
> player
Sprite { x: 200, y: 200, color: "deepskyblue", ... }

> player.constructor.name
"Sprite"

> player.color
"deepskyblue"

> player.color = "red"
> // canvas updates immediately — the property is live
```

<v-click>

The `player` object is alive in memory. You can read and write its properties from the console.

**Teacher note:** "This is not magic. This is JavaScript. The property IS the thing."

</v-click>

---

# What is a class?

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## Class (blueprint)

- A **template** for creating objects
- Defined once in your code
- Describes what properties and methods every instance will have

```js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
```

</div>
<div>

## Instance (built object)

- An actual **object** created from the blueprint
- Has its **own** property values
- Many instances can exist from one class

```js
let a = new Point(0, 0);
let b = new Point(5, 10);
// a.x !== b.x — different objects
```

</div>
</div>

<v-click>

`Sprite` is the blueprint. `player` is one of potentially many instances.

</v-click>

---

# Class syntax

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## Syntax

```js
class Name {
  constructor(param1, param2) {
    // runs when you call: new Name(...)
    this.prop1 = param1;
    this.prop2 = param2;
  }

  methodName() {
    return this.prop1 + this.prop2;
  }
}
```

</div>
<div>

## Minimal example

```js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  distanceTo(other) {
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

</div>
</div>

---

# What `new` does — step by step

When you write `let p = new Point(3, 4)`:

<v-click>

**Step 1** — JavaScript allocates a brand-new empty object `{}`.

</v-click>

<v-click>

**Step 2** — It binds that object to the keyword `this` and calls `constructor(3, 4)`.

</v-click>

<v-click>

**Step 3** — The constructor fills in properties: `this.x = 3`, `this.y = 4`.

</v-click>

<v-click>

**Step 4** — The new object is returned and assigned to `p`.

`p.x` is `3`. `p.y` is `4`. The class definition is done — `p` lives on its own.

</v-click>

---

# The `this` keyword

Inside any method, `this` refers to **the instance the method was called on**.

```js
class Point {
  constructor(x, y) {
    this.x = x;   // "store x on THIS point"
    this.y = y;   // "store y on THIS point"
  }
}

let origin = new Point(0, 0);
let corner = new Point(400, 400);
```

<v-click>

When you write:

```js
player.color = 'red';
```

Inside the Sprite class, that same line reads:

```js
this.color = 'red';   // sets color on THIS sprite, not on any other
```

Every instance has its own copy of its data.

</v-click>

---
layout: center
class: text-center
---

# Q1 break (~1 min)

**Turn to your neighbor:**

If you write:

```js
const a = new Sprite(100, 100, 30, 30);
const b = new Sprite(300, 100, 30, 30);
```

Is `a.color === b.color`?

**(No answer on this slide — discuss first.)**

---

# Writing your first class: Enemy

You've read Sprite's properties for weeks. Now you'll write something just like it.

Goal: an `Enemy` class that:

- Stores position and hit points
- Renders a sprite with its HP displayed
- Can take damage and disappear when HP hits zero

---

# The Enemy class — live code

```js
class Enemy {
  constructor(x, y, hp) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.color = 'red';
  }

  damage(n) {
    this.hp -= n;
    if (this.hp <= 0) {
      this.sprite.remove();
    }
  }

  render() {
    this.sprite.text = String(this.hp);
  }
}
```

Three parts: **constructor** (setup), **damage** (behavior), **render** (display).

---

<script setup lang="ts">
const sketchEnemy = `class Enemy {
  constructor(x, y, hp) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.sprite = new Sprite(x, y, 30, 30, 'static');
    this.sprite.color = 'red';
    this.sprite.text = String(hp);
  }
  damage(n) {
    this.hp -= n;
    this.sprite.text = String(this.hp);
    if (this.hp <= 0) this.sprite.remove();
  }
}

let enemy;

function setup() {
  new Canvas(400, 400);
  enemy = new Enemy(200, 200, 10);
}

function draw() {
  background('#222');
  if (kb.presses('x')) enemy.damage(1);
}`;
</script>

# Enemy in setup() + draw()

<Q5Runner :code="sketchEnemy" :width="340" :height="340" />

Click the canvas, then press **X** 10 times. Watch the HP count down and the sprite vanish.
(We use `x` instead of `space` because Slidev uses space to advance slides.)

---

# What `this` means inside Enemy

Three uses of `this` on three different lines — all referring to the **same instance**:

- `this.x = x` — stores the enemy's position as instance data. Each enemy remembers its own x.
- `this.sprite = new Sprite(...)` — creates a q5play sprite that belongs to **this** enemy and no other.
- `this.sprite.remove()` — despawns **this** enemy's sprite. Other enemies on screen are unaffected.

<v-click>

`this` is how objects talk to themselves. It is always the current instance.

A common early bug: forgetting `this` and writing a bare variable name instead — the property doesn't get stored.

</v-click>

---

# Methods vs properties

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## Properties

A **value** stored on the instance.

| Name | What it holds |
|------|--------------|
| `.hp` | current hit points |
| `.x` | x position |
| `.sprite` | the q5play Sprite object |

Access with dot notation: `enemy.hp`

</div>
<div>

## Methods

A **function** defined on the instance.

| Name | What it does |
|------|-------------|
| `.damage(n)` | subtracts n from hp |
| `.render()` | updates sprite text |
| `.constructor(...)` | runs at `new` time |

Call with parentheses: `enemy.damage(1)`

</div>
</div>

---

# The other OOP vocabulary

You'll hear these terms in later CS courses. **Not test material this week** — just names to recognize.

<v-click>

- **Encapsulation** — bundling data and behavior into one unit. Your `Enemy` class is already doing this: `hp` (data) and `damage()` (behavior) live together.

</v-click>

<v-click>

- **Inheritance** — a class can extend another class, inheriting its properties and methods. (`PowerUp extends Collectible` would be an example.)

</v-click>

<v-click>

- **Polymorphism** — different classes can respond to the same method name. Both `Enemy` and `Player` could have a `.render()` method; the engine calls the right one.

</v-click>

---

# Pair exercise

**15 minutes.**

Open your in-app editor. Start with the `Enemy` class from Worked Example 2.

Add:

1. A **new property** in the constructor — for example: `this.hasShield = false`
2. A **new method** that uses it — for example:

```js
shield() {
  this.hasShield = true;
  this.sprite.color = 'blue';
}
```

Then: instantiate your modified `Enemy` in `setup()` and call your new method in `draw()` when a key is pressed.

---

# Procedural vs OOP — the same problem

**Worked Example 3.** Two ways to manage a fleet of enemies.

The problem is identical. The approach is different. We'll compare them side-by-side.

---

# Procedural: parallel arrays

```js
let enemyX  = [];
let enemyY  = [];
let enemyHP = [];

function spawnEnemy(x, y, hp) {
  enemyX.push(x);
  enemyY.push(y);
  enemyHP.push(hp);
}

function damageEnemy(i, n) {
  enemyHP[i] -= n;
  if (enemyHP[i] <= 0) {
    enemyX.splice(i, 1);
    enemyY.splice(i, 1);
    enemyHP.splice(i, 1);
  }
}
```

Three separate arrays, one index to rule them all. Each array tracks one piece of data.

---

# OOP: array of instances

```js
let enemies = [];

class Enemy {
  /* same constructor + damage as Worked Example 2 */
}

function spawnEnemy(x, y, hp) {
  enemies.push(new Enemy(x, y, hp));
}

// damage is a method on the instance — called directly:
// enemies[0].damage(5);
```

One array, one class. The instance holds all its own data and knows how to act on it.

---

# Side-by-side comparison

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## Procedural

**Add a property (e.g. `element`)**
Update 3 arrays + every function that touches them.

**Delete an enemy**
Splice 3 arrays at the same index — miss one and you have a bug.

**Read at a glance**
Hard — data and behavior are far apart.

</div>
<div>

## OOP

**Add a property (e.g. `element`)**
Add `this.element = element` in the constructor. Done.

**Delete an enemy**
`this.sprite.remove()` — one call handles the visual. Filter one array.

**Read at a glance**
Easier — everything about an enemy is inside `Enemy`.

</div>
</div>

<v-click>

Ask yourself: which version would you rather hand to someone who has never seen it before?

</v-click>

---

# When procedural still wins

OOP is not always the right tool. Procedural code is faster to write and easier to read for small problems.

- **Tiny scripts** — a short transform that runs once doesn't need a class.
- **One-off data work** — reading a JSON file and summing values: just write the loop.
- **No state + behavior bundling needed** — if data and functions naturally stay separate, don't force them together.

Don't demonize procedural. Most real codebases use both.

---

# When OOP wins

Use OOP when your problem looks like:

- **Entities with both state AND behavior** — enemies have hp (state) and can take damage (behavior). Classes model this directly.
- **Many of them at once** — a fleet of enemies, a pile of collectibles. Each instance manages itself.
- **You'll extend with new kinds** — a `BossEnemy` that adds a `shield` without rewriting the base class.

The rule of thumb: if you find yourself writing parallel arrays and helper functions that all take the same index, you're probably writing a class.

---

# ⚠ A12.2 — The SLO-2 written assignment

**This one gets retained.**

> A12.2 is your teacher's **SLO 2 dual-enrollment evidence artifact**. Write it carefully — the teacher keeps a copy.

**Required sections (300–500 words, 1 page):**

1. **Definitions in your own words** — what does procedural mean, and what does OOP mean? No copied definitions.
2. **A specific Q1 example** — name an assignment you wrote in Q1 using the procedural approach. 1–2 sentences.
3. **A specific q5play example** — name where in your q5play code you used OOP. Describe how the class organized your code.
4. **When OOP wins** — one scenario where OOP is clearly better, explained in terms of readability, extensibility, or separation of data and behavior.

---

# A12.1 — Collectible Class lab

**15 pts · SLO 2 support + SLO 3 · Due end of Session 2**

Write a `Collectible` class, instantiate 5 or more, detect overlap with the player, and accumulate a score.

Find the full lab in-app: **2.2.10 Collectible Class**.

```js
class Collectible {
  constructor(x, y, value, color) {
    // TODO: store x, y, value
    // TODO: create this.sprite = new Sprite(...)
  }

  collect() {
    // TODO: return this.value AND remove the sprite
  }
}
```

The grader checks that your code satisfies the requirements — not that it "runs". Write the real implementation.

---

# The scaffold rule (reminder)

Your starter file has **empty method bodies** and `// STEP N:` comments. You write the code inside them.

```js
class Collectible {
  constructor(x, y, value, color) {
    // STEP 1: store x, y, value on this
    // STEP 2: create this.sprite = new Sprite(...)
    // STEP 3: set sprite color
  }

  collect() {
    // STEP 4: return this.value and call this.sprite.remove()
  }
}
```

The grader runs regex patterns against your script. If the starter already satisfies them, you earn nothing — the point is **your** code, not the scaffold's.

---

# What the grader looks for (A12.1)

Five requirements — all must be present in your submitted `script.js`:

- `class Collectible` — the class must be defined by that exact name.
- `constructor(` — must have a constructor with parameters.
- `collect()` — the collect method must exist.
- `new Collectible(` — you must instantiate at least once.
- `overlaps(` — overlap detection must appear in your `draw()` loop.

If one is missing, partial credit applies per the rubric.

---

# Challenge — optional stretch

Done early? Three optional extensions from the 2.2.12 Challenges lesson:

<v-click>

**Challenge 1** — Add `isAlive()` to `Enemy`:

```js
isAlive() {
  return this.hp > 0;
}
```

</v-click>

<v-click>

**Challenge 2** — Write a `Player` class with `move(dir)` and `jump()` methods.

</v-click>

<v-click>

**Challenge 3** — Write `PowerUp extends Collectible` using `extends` and `super()`.

This previews **inheritance** — not required this week, but here if you're curious.

</v-click>

---

# Where 2.2 leaves you

You can now write a class, instantiate it, and give it behavior.

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

## This week you learned

- `class` / `constructor` / `new` / `this`
- Instance vs class (blueprint vs object)
- Properties vs methods
- Procedural vs OOP trade-offs

</div>
<div>

## Next week (2.3)

**Groups & Overlaps**

`Group` — a specialized class-aware container for many sprites.

Automatic overlap detection. Spawning patterns. Enemy fleets without a manual loop.

</div>
</div>

---

# Quick reference card

Bookmark this slide.

| Term | One-line definition |
|------|---------------------|
| `class` | Keyword to define a blueprint for objects |
| `constructor` | Method that runs when `new` is called; sets up the instance |
| `new` | Operator that allocates and returns a new instance |
| `this` | Inside a method, the instance the method was called on |
| **Instance** | A specific object built from a class; has its own property values |
| **Method** | A function defined inside a class; called on an instance |
| **Property** | A value stored on an instance (`this.color`, `this.hp`) |

---
layout: center
class: text-center
---

# Questions?

Open **`/docs/q5play`** for the full Sprite class reference — read it now as a class API, not just a list of properties.

**Next up:** Worked Example 2 live — write `Enemy` together.

<div class="text-sm opacity-70 mt-8">
All code in these slides is editable — hit <kbd>Run</kbd> to see changes live.
</div>
