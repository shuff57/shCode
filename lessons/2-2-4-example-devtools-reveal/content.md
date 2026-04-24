**Goal:** Prove that `Sprite` is a class and that `player` is an instance of it.

## Step 1 — Run this familiar sketch

```js live console
let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
}
```

Nothing new — you wrote this exact code in 2.1. But notice the panel below the preview: it's a console attached to this running sketch. Every `console.log()` call in your sketch prints there, and you can type expressions into the `>` prompt to poke at the running program — just like Chrome DevTools, but embedded in the page.

Click **Run**, then keep the sketch running while you work through the next steps.

## Step 2 — Ask the browser what `player` is

Click the `>` prompt below the preview. Type:

```
player
```

Press Enter. The console prints something like:

```
Sprite { x: 200, y: 200, … }
```

That word `Sprite` on the left is a **class name**. Every object in JavaScript knows which class built it — the console is reading that tag off the object itself.

## Step 3 — Ask the object who made it

At the prompt, type:

```
player.constructor.name
```

The console prints:

```
"Sprite"
```

Every object has a `.constructor` property — a reference to the class that stamped it out. `new Sprite(...)` secretly set this up for you. You can ask any object in any program "who made you?" at any time.

## Step 4 — Mutate a property live

At the prompt, type:

```
player.color = "red"
```

The canvas updates immediately. That property belongs to *this specific instance* of `Sprite`, not to all sprites everywhere. If you added a `player2`, its color would be untouched.

## Step 5 — Confirm it on screen

Edit the live editor. Replace `draw()` with:

```js
function draw() {
  background('#222');
  player.text = player.constructor.name;
}
```

Click **Run** again. Now the word `Sprite` is drawn on the square. The class name isn't something the docs told you — it's a property the object carries with it everywhere it goes.

## Key takeaways

- `Sprite` is a **class** — a blueprint for building sprite objects.
- `player` is an **instance** of the class — one specific object built from the blueprint.
- `new Sprite(...)` secretly called the class's **constructor** to stamp out the instance.
- Every instance owns its own properties (`color`, `pos`, `vel`). Mutating one never affects another.
- You've been doing OOP since Week 10. This week, you'll write the class yourself.
