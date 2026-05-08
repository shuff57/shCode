# Refresher: class, constructor, this

Module 3.3 uses the exact same OOP syntax you learned in Unit 2.2. This reading restates that pattern so it is fresh before you apply it to 3D shapes.

## The class declaration

A class is a blueprint. It defines the structure and behavior that every instance will share:

```js
class Counter {
  constructor() {
    this.n = 0;
  }
}
```

- `class Counter` — declares a class named `Counter`
- `constructor()` — the setup method that runs when you write `new Counter()`
- `this.n = 0` — creates a data member named `n` on the instance, set to 0

## The `this` keyword

Inside a class, `this` always refers to the instance being operated on. Every instance gets its own copy of every `this.` property:

```js
class Counter {
  constructor() {
    this.n = 0;       // each instance has its own n
  }
  tick() {
    this.n += 1;      // this.n refers to THIS instance's n
  }
}

let a = new Counter();
let b = new Counter();
a.tick();
// a.n is now 1; b.n is still 0
```

## Methods

Methods are functions defined inside the class body. They have access to `this`:

```js
class Counter {
  constructor() {
    this.n = 0;
  }
  tick() {
    this.n += 1;
  }
  isHigh() {
    return this.n > 10;
  }
}
```

Call a method with `instance.methodName()`:

```js
let c = new Counter();
c.tick();
c.tick();
console.log(c.n);       // 2
console.log(c.isHigh()); // false
```

## Creating instances with `new`

`new ClassName()` runs the constructor and returns a fresh instance:

```js
let c1 = new Counter();
let c2 = new Counter();
```

`c1` and `c2` are independent — changing one does not affect the other.

## Constructor parameters

Constructors can accept parameters to set up each instance differently:

```js
class Counter {
  constructor(start) {
    this.n = start;
  }
}

let c = new Counter(5);  // starts at 5 instead of 0
```

---

## Glossary

| Term | Meaning |
|---|---|
| class | A blueprint for creating objects with shared structure and behavior |
| instance | One object created from a class with `new` |
| constructor | The method that runs when `new ClassName()` is called; sets up initial state |
| this | Refers to the current instance inside a class method or constructor |
| method | A function defined inside a class body |
| data member | A value stored on an instance using `this.name = value` in the constructor |
