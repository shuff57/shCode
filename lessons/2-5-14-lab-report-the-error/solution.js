// 2.5.14 Report the Error
// Reading a property of null always raises a TypeError. The catch prints
// both the error's name and its message.

try {
  const person = null;
  console.log(person.name);
} catch (err) {
  console.log(err.name);
  console.log(err.message);
}
