**Goal:** Point at each part of a class and say what it is for, using the `Point` and `Tag` classes you have already read.

## Step 1: Run one small class

Here is a class that holds a position and a few words. Run it and confirm two messages appear.

```js live
class Message {
  constructor(x, y, words) {
    this.x = x;
    this.y = y;
    this.words = words;
  }
}

let hello, bye;

function setup() {
  new Canvas(400, 200);
  hello = new Message(40, 70, 'hello');
  bye = new Message(220, 140, 'goodbye');
}

function draw() {
  background('#222');
  fill('white');
  textSize(24);
  text(hello.words, hello.x, hello.y);
  text(bye.words, bye.x, bye.y);
}
```

**What you'll see:** the word `hello` near the top left and `goodbye` lower and to the right.

## Step 2: Name the four parts

Look at the `class Message { ... }` block. It has four parts, and you have met every one of them:

| Part | In the code | What it is for |
|------|-------------|----------------|
| **The class name** | `class Message` | The name of the blueprint. You use it after `new` to build one. |
| **The constructor** | `constructor(x, y, words) { ... }` | The one function `new` calls for you. |
| **The parameters** | `x, y, words` | Named slots that receive the arguments you pass to `new Message(...)`. |
| **The properties** | `this.x`, `this.y`, `this.words` | The data each instance keeps. A line like `this.x = x` creates the property and stores the argument in it. |

Everything *outside* the class block is code that **uses** the blueprint: `new Message(40, 70, 'hello')` builds one instance, and `hello.words` reads one of its properties.

## Step 3: Follow one value through all four parts

Take the word `'hello'`. This is the path it travels:

1. You write `new Message(40, 70, 'hello')`. `'hello'` is the third **argument**.
2. The constructor receives it in the third **parameter**, `words`.
3. The line `this.words = words` stores it in the instance's **property** named `words`.
4. Later, `hello.words` reads that property back, and `text(...)` draws it.

Arguments are matched to parameters by **position**, not by name. The third argument goes into the third parameter.

## Step 4: Change one thing and predict first

In the editor above, change the first message to `new Message(70, 40, 'hello')` and decide where `hello` will move **before** you run it.

The first number still goes into `x` and the second into `y`, so the word moves to the right and up. The `bye` message does not move, because it is a separate instance with its own properties.

## Key takeaways

- A class has a **name**, a **constructor**, **parameters**, and **properties** stored on `this`.
- Parameters receive the arguments from `new`, matched by position.
- `this.name = value` is the line that creates a property on the new instance.
- Code outside the class builds instances with `new` and reads their properties with a dot.
- A class can also hold functions that act on its data. You will write those in 5.4.

Next: 5.3.7 Worked Example: You've been using classes.
