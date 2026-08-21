// 2.5.8 Catch Your First Error
// username is never declared, so reading it throws. The catch falls back
// to a guest, and the program keeps going to print Welcome!.

try {
  console.log(username);
} catch (err) {
  console.log("Falling back to Guest");
}

console.log("Welcome!");
