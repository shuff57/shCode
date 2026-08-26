## Properties: data on `this`

**Read before `2.2.4b Lab: Read a property`.** About 4 minutes.

By the end of this reading you should be able to answer:

- What is a property, and where does it live?
- Can two different instances share the same property name but hold different values?

A property is a named slot for data that belongs to one specific instance. When you write `this.color = c` inside a constructor, you're telling that instance "hold on to this value and call it `color`."

**What you'll learn from it:**

- Properties are created by assigning to `this.name`, usually inside the constructor.
- Each instance gets its own independent copy of every property.
- Outside the class, you read a property with `instance.propName` and write it with `instance.propName = newValue`.
- You can have as many properties as you need: add one line per property in the constructor.

**Try it:**

```js live
class Box {
  constructor(c) {
    this.color = c;
    this.size = 40;
  }
}

let b1, b2;

function setup() {
  new Canvas(360, 200);
  b1 = new Box('deepskyblue');
  b2 = new Box('orange');
}

function draw() {
  background('#222');
  fill(b1.color);
  square(60, 80, b1.size);
  fill(b2.color);
  square(200, 80, b2.size);
  fill('white');
  textSize(12);
  text('b1.color = ' + b1.color, 20, 170);
  text('b2.color = ' + b2.color, 200, 170);
}
```

**What you'll see:** a blue square on the left and an orange square on the right. Each box holds its own `color` value: changing one won't touch the other.

**Try this:** add a third property `this.size = 40` to the constructor. Then in `draw`, change `b2.size` to `80` after the canvas is created and observe that only the right square grows. One property, two instances, two independent values.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Property** | A named piece of data stored on a single instance (`this.color = 'red'`). |
| **Instance state** | All the properties owned by one specific instance at a given moment. |
| **Dot notation** | The `instance.propName` syntax for reading or writing a property. |
