## Object Destructuring

**What you'll learn:**
- How the `{ }` on the left of `=` is a pattern, not an object
- How object destructuring matches variables to properties by name

Reading several properties out of an object gets repetitive. **Destructuring** does all three in one line.

**Try it:** Unpack three properties into variables of the same names.

```js live plain
const student = { name: "Marisol", age: 19, city: "Chico" };

const { name, age, city } = student;

console.log(name + ", " + age + ", " + city);
```

The braces on the **left** of the `=` are not making an object. They are a pattern saying "take the properties called `name`, `age` and `city`, and make variables of those names."

**Try it:** Take only two of the properties, in a different order.

```js live plain
const student = { name: "Marisol", age: 19, city: "Chico" };

const { city, name } = student;

console.log(name + " lives in " + city);
```

You do not have to take everything, and order is irrelevant, because matching is by name.

## Array Destructuring

**What you'll learn:**
- How square brackets destructure an array by position

Arrays destructure too, by position rather than by name — square brackets instead of braces.

**Try it:** Unpack two array elements into `x` and `y`.

```js live plain
const point = [10, 20];
const [x, y] = point;

console.log("x is " + x + ", y is " + y);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **destructuring** | Unpacking values out of an object or array into separate variables |
| **object pattern** | `const { a, b } = obj` — matched by property name |
| **array pattern** | `const [a, b] = arr` — matched by position |
| **partial destructuring** | Taking only some of the properties: the rest are simply not named |
| **order** | Irrelevant for objects (by name); everything for arrays (by position) |
