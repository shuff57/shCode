// 2.3.13 Fix the Fall-Through Bug -- reference solution.
//
// The only change from the starter is the missing `break` after the "apple"
// case. Case values, messages and `let` are untouched, because the starter
// tells the student not to change them.

let fruit = "apple";

switch (fruit) {
  case "apple":
    console.log("Apples are red or green.");
    break;
  case "banana":
    console.log("Bananas are yellow.");
    break;
  default:
    console.log("Unknown fruit.");
}
