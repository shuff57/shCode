## Keys That Are Not Simple Words

**What you'll learn:**
- Why dot notation fails on a key that contains a space
- How square brackets accept any string key

Dot notation needs a name you can type literally. A key with a space in it cannot be written after a dot: `settings.font size` is not valid JavaScript, because the space ends the name.

**Try it:** Reach a key with a space by wrapping the key in quotes inside square brackets.

```js live plain
const settings = {
  "font size": 14,
  theme: "dark"
};

console.log(settings["font size"]);
console.log(settings.theme);
```

Square brackets take a *string*, so any key at all is reachable.

## Keys Held in a Variable

**What you'll learn:**
- How `object[variable]` evaluates the name first, then fetches
- Why `object.variable` looks for a property literally called `variable`

The other case dot notation cannot express is a key you do not know until the program runs.

```js live plain
const student = { name: "Marisol", age: 19, city: "Chico" };

const field = "age";

console.log(student[field]);
console.log(student.field);
```

`student[field]` looks up the variable `field`, finds `"age"`, and fetches that property. `student.field` looks for a property literally named `"field"`, which does not exist, so it gives `undefined`.

Dot means "the property spelled exactly like this". Brackets mean "work out the name first, then fetch it". Whenever the property name lives in a variable — a loop counter, a user's choice, a key read from data — you need brackets.

## Walking Every Key

**What you'll learn:**
- How `Object.keys` gives an array of the key names
- Why fetching each value needs brackets inside the loop

```js live plain
const student = { name: "Marisol", age: 19, city: "Chico" };

for (const key of Object.keys(student)) {
  console.log(key + ": " + student[key]);
}
```

Inside the loop the name is held in the variable `key`, so `student[key]` is the only way to reach each value. There is no way to write that loop with dot notation.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **square bracket notation** | `object[expression]` works out the property name first |
| **computed key** | A key held in a variable or expression, reachable only with brackets |
| **quoted key** | A key that is not a simple word (e.g. `"font size"`), reachable only with brackets |
| **`Object.keys(obj)`** | Returns an array of an object's property names |
| **dot vs brackets** | Dot = the exact spelled name; brackets = evaluate first, then fetch |
