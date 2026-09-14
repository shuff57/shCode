// 3.6.12 Lab: Object-Parameter Mutation

function birthday(person) {
  person.age = person.age + 1;
}

function birthdaySafe(person) {
  return { ...person, age: person.age + 1 };
}

const user = { name: "Marisol", age: 30 };

birthday(user);
console.log(user);

const older = birthdaySafe(user);
console.log(older);
console.log(user);
