# 2.2.3 Reading — JavaScript Classes

## What is a class?

A **class** is a blueprint. It describes what data an object holds and what it can do — but it is not the object itself. The actual object is called an **instance**, and you create one with the `new` keyword.

Think of a class as a cookie cutter and an instance as the cookie. Every cookie has the same shape (same properties, same methods), but each one is a separate object with its own values.

## Class syntax

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

Three parts to notice:

- **`constructor(...)`** — runs automatically when you write `new Point(...)`. Its job is to receive arguments and store them on `this`.
- **`this`** — refers to the instance being built (or, inside a method, the instance the method was called on). Every property you want to keep must be attached to `this`.
- **Methods** — regular functions written inside the class body, without the `function` keyword. They live on every instance.

## What `new` does, step by step

When JavaScript sees `new Point(3, 4)` it does four things:

1. Allocates a fresh, empty object.
2. Sets that object's internal prototype to `Point.prototype` (so it inherits the methods).
3. Calls `constructor(3, 4)` with `this` bound to the new object.
4. Returns the new object and assigns it to your variable.

```js
let a = new Point(3, 4);
let b = new Point(0, 0);

console.log(a.x);              // 3
console.log(a.distanceTo(b));  // 5
console.log(b.x);              // 0  — a separate object
```

`a` and `b` are independent. Changing `a.x` has no effect on `b.x`.

## `this` inside a method

```js
class Point {
  constructor(x, y) {
    this.x = x;  // "my x"
    this.y = y;  // "my y"
  }

  distanceTo(other) {
    // "this" is whichever Point called distanceTo
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

When you write `a.distanceTo(b)`, JavaScript sets `this = a` for the duration of that call. `this.x` is `a.x`; `other.x` is `b.x`.

## Connection to q5play

You have been writing `new Sprite(x, y, w, h)` since Week 10. `Sprite` is a class defined inside the q5play library. Every time you call `new Sprite(...)` you are creating an instance of that class — with its own `pos`, `vel`, `color`, and all the other properties.

Understanding the class/instance model explains why `player.color = 'red'` only changes the player sprite, not every sprite on the screen. Each sprite is its own object.

In the next example you will write your own class — `Enemy` — and watch exactly these same steps happen in DevTools.
