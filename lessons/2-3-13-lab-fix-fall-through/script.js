// 2.3.13 Fix the Fall-Through Bug
//
// This code should print exactly one line but prints two.
// STEP 1: Run it and read the output.
// STEP 2: Find the missing stopping statement and add it back.
//         Do not change anything else.

let fruit = "apple";

switch (fruit) {
  case "apple":
    console.log("Apples are red or green.");
  case "banana":
    console.log("Bananas are yellow.");
    break;
  default:
    console.log("Unknown fruit.");
}
