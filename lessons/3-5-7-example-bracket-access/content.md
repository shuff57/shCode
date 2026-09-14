**Goal:** Fetch a property whose name is stored in a variable, and see exactly where dot notation goes wrong.

## Step 1: A key living in a variable

The object has an `age` property. The variable `field` holds the *string* `"age"` — the name of the property we want.

```js live plain
const student = { name: "Marisol", age: 19, city: "Chico" };

const field = "age";

console.log(field);
```

## Step 2: Dot notation reads the wrong name

`student.field` looks for a property literally named `field`, not the property whose name is *in* `field`. The object has no such property, so it gives `undefined`.

```js live plain
const student = { name: "Marisol", age: 19, city: "Chico" };

const field = "age";

console.log(student.field);
```

## Step 3: Brackets evaluate the variable first

Square brackets work out what is inside them first. Here that gives `"age"`, and from there the property is fetched. This is the form that returns `19`.

```js live plain
const student = { name: "Marisol", age: 19, city: "Chico" };

const field = "age";

console.log(student[field]);
```

## Key takeaways

- `object.name` looks for a property spelled exactly `name`.
- `object[variable]` evaluates the variable first, then fetches the property it names.
- Any time the key lives in a variable, brackets are required — dot notation cannot express it.
- Brackets take a string, so they also reach keys with spaces that a dot could never type.
