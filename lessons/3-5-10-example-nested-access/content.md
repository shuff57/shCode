**Goal:** Follow a nested access chain one step at a time, then recover a whole record out of an array of objects.

## Step 1: One object inside another

`student` has an `address` property whose value is itself an object. Print the inner object to see it.

```js live plain
const student = {
  name: "Marisol",
  address: {
    city: "Chico",
    state: "CA"
  }
};

console.log(student.address);
```

## Step 2: Take the chain one property at a time

`student.address` gives the inner object; adding `.city` reads the field from that result. Read the chain left to right.

```js live plain
const student = {
  name: "Marisol",
  address: {
    city: "Chico",
    state: "CA"
  }
};

console.log(student.address.city);
console.log(student.address.state);
```

## Step 3: An array of objects

Each element is a record. The loop picks one record with `students[i]`, then reads a field with a dot.

```js live plain
const students = [
  { name: "Marisol", grade: 92 },
  { name: "Dev", grade: 78 },
  { name: "Priya", grade: 85 }
];

for (let i = 0; i < students.length; i++) {
  console.log(students[i].name + ": " + students[i].grade);
}
```

## Step 4: Pull one record into a name

`students[i]` is itself an object, so it can be stored in a variable and read from there. That keeps the last line short.

```js live plain
const students = [
  { name: "Marisol", grade: 92 },
  { name: "Dev", grade: 78 },
  { name: "Priya", grade: 85 }
];

const one = students[1];
console.log(one.name + " scored " + one.grade);
```

## Key takeaways

- A property's value can be another object, or an array, or an array of objects.
- A chain `a.b.c` is read one step at a time, each applied to the previous result.
- `students[i]` selects one record; `.name` reads one field of that record.
- Storing a selected record in a variable can make the following lines much easier to read.
