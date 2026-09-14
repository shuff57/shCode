**Goal:** Build a **record** — one object that stands for one thing — and then find it in a list of records.

A **record** is an object whose properties are the fields of one real thing: one student, one item, one row of a table. The word matters because it names the shape every table of data has, and it is the shape classes are built on later.

## Step 1: One record

Each property is one field of the same student. Together they describe a single thing.

```js live plain
const student = {
  name: "Marisol",
  grade: 92,
  city: "Chico"
};

console.log(student.name + " scored " + student.grade);
```

## Step 2: A list of records

The array holds interchangeable rows; each element is one record of the same shape. This is the shape of a spreadsheet, a cart, or a player list.

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

## Step 3: Find one record

A loop, a condition, and an early `return` walk the list and hand back the matching record — or `null` when nothing matches. Returning `null` for "not found" says *nothing here* on purpose, unlike `undefined`, which is also what a typo gives.

```js live plain
const students = [
  { name: "Marisol", grade: 92 },
  { name: "Dev", grade: 78 },
  { name: "Priya", grade: 85 }
];

function findStudent(list, wantedName) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].name === wantedName) {
      return list[i];
    }
  }
  return null;
}

const found = findStudent(students, "Dev");
console.log(found.grade);

const missing = findStudent(students, "Sam");
console.log(missing);
```

## Key takeaways

- A **record** is one object whose properties are the fields of one thing.
- An array of records is the shape of every table of data.
- Finding a record is the same linear search as before, only over records instead of strings.
- `null` is a deliberate "not found"; `undefined` is also what a typo produces.
