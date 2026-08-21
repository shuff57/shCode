function greet(name) {
  return "Hi " + name;
}

function farewell(name) {
  return "Bye " + name;
}

const shout = (name) => "HI " + name.toUpperCase() + "!";

console.log(greet("Ava"));
console.log(farewell("Ava"));
console.log(shout("Ava"));
