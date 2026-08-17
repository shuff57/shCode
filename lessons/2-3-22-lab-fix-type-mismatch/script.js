// 2.3.22 Fix the Type Mismatch
//
// This code should print "Second place" but prints "No medal" instead.
// STEP 1: Run it and explain why: place is a string, the cases are
//         numbers, and switch always compares strictly.
// STEP 2: Fix it WITHOUT changing the case values — convert the
//         switched value itself so it is a number before any case
//         is checked.

let place = "2";

switch (place) {
  case 1:
    console.log("First place");
    break;
  case 2:
    console.log("Second place");
    break;
  default:
    console.log("No medal");
}
