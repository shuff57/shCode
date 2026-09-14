// 3.4.17 Lab: Fix a Broken Arrow
//
// area is meant to be a two-parameter arrow function that returns the
// product of its two arguments. It will not parse: this line throws a
// SyntaxError before any of the program runs.
//
// Run it and read the error, then find the one thing missing from the
// parameter list.

const area = w, h => w * h;

console.log(area(3, 4));

// STEP 1: Run the starter and read the error. A syntax error stops the
//         whole file, so the console.log below never gets a chance.

// STEP 2: Look at the left of the => arrow. There are two parameters but
//         they are not grouped. The parentheses around parameters are
//         optional for exactly one parameter and required for two or more.

// STEP 3: Add the missing parentheses around the two parameters, leaving
//         the body (w * h) exactly as it is. Run it again and confirm the
//         result is the product of 3 and 4.
