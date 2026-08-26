// 2.4.23 A2.4.1: Debug Five Loops
//
// ---------------------------------------------------------------
// PROGRAM 1: infinite loop: missing update
//
// let n = 1;
// while (n <= 5) {
//   console.log(n);
// }
//
// FIX: the original had no way to change n, so the loop never stopped.
let n = 1;
while (n <= 5) {
  console.log(n);
  n++;
}

// ---------------------------------------------------------------
// PROGRAM 2: infinite loop: update moves the wrong way
//
// for (let count = 10; count > 0; count++) { ... }
//
// FIX: count++ made the counter grow away from the stopping point.
// Decrementing makes it move toward 0, so it logs 10 down to 1.
for (let count = 10; count > 0; count--) {
  console.log(count);
}

// ---------------------------------------------------------------
// PROGRAM 3, off by one: misses the last value
//
// for (let i = 1; i < 5; i++) { ... }
//
// FIX: the < comparison stopped one value early. Using <= lets
// the loop reach 5 and log 1 2 3 4 5.
for (let i = 1; i <= 5; i++) {
  console.log(i);
}

// ---------------------------------------------------------------
// PROGRAM 4, off by one: one extra value
//
// for (let k = 0; k <= 5; k++) { ... }
//
// FIX: starting at 0 printed six lines instead of five. Starting
// at 1 prints exactly 1 2 3 4 5.
for (let k = 1; k <= 5; k++) {
  console.log(k);
}

// ---------------------------------------------------------------
// PROGRAM 5: do...while logic error
//
// let greeted = true;
// while (!greeted) { ... }
//
// FIX: a plain while can skip its body entirely when the condition
// is already false. A do...while guarantees the body runs at least
// once, so "Hello!" always prints no matter what greeted starts as.
let greeted = true;
do {
  console.log("Hello!");
  greeted = true;
} while (!greeted);
console.log("Program finished.");
