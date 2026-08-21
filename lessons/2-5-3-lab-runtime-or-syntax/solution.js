// 2.5.3 Runtime or Syntax?
// This is a runtime error: the code parses fine, but reading a variable
// that was never declared fails when the line actually runs.

console.log("Before the error");
console.log(mystery);
console.log("After the error");
