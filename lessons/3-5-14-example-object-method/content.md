**Goal:** Attach a function as a property, then call it as a method and tell it apart from a plain property.

## Step 1: A property that holds a function

The `greet` key's value is a function. Storing it is exactly what a method is; nothing else is special yet.

```js live plain
const student = {
  name: "Marisol",
  greet: function () {
    return "Hello!";
  }
};

console.log(student.greet);
```

## Step 2: Call it with parentheses

`student.greet()` runs the function and returns its result. The parentheses are the call.

```js live plain
const student = {
  name: "Marisol",
  greet: function () {
    return "Hello!";
  }
};

console.log(student.greet());
```

## Step 3: A method that reads another property

A method body can read the object's other fields by name. (Referring to the object itself needs `this`, which arrives with classes in Chapter 5, so this example passes the name in.)

```js live plain
const student = {
  name: "Marisol"
};

student.greet = function (who) {
  return "Hello, " + who + "! I am " + student.name + ".";
};

console.log(student.greet("Dev"));
```

## Key takeaways

- A method is a property whose value is a function.
- `object.method` without parentheses is the function value; `object.method()` calls it.
- A method body can read the object's other fields by name.
- A plain property such as `length` is data, so it never takes parentheses.
