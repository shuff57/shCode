// 2.4.23 A2.4.1 — Debug Five Loops
//
// Each program below is shown BROKEN, as a comment. Do not uncomment
// and run the broken versions — two of them never stop. Your job is
// to write a FIXED, runnable version under each one, plus a comment
// explaining what the bug was.

// ---------------------------------------------------------------
// PROGRAM 1 — infinite loop: missing update
//
// let n = 1;
// while (n <= 5) {
//   console.log(n);
// }
//
// STEP 1: Write the fixed version here. It should log 1 through 5,
//         then stop. Add a comment explaining the bug.


// ---------------------------------------------------------------
// PROGRAM 2 — infinite loop: update moves the wrong way
//
// for (let count = 10; count > 0; count++) {
//   console.log(count);
// }
//
// STEP 2: Write the fixed version here. It should log 10 down to 1,
//         then stop. Add a comment explaining the bug.


// ---------------------------------------------------------------
// PROGRAM 3 — off by one: misses the last value
//
// for (let i = 1; i < 5; i++) {
//   console.log(i);
// }
// Expected: 1 2 3 4 5. Actual: 1 2 3 4 — it stops one value early.
//
// STEP 3: Write the fixed version here. Add a comment explaining the bug.


// ---------------------------------------------------------------
// PROGRAM 4 — off by one: one extra value
//
// for (let k = 0; k <= 5; k++) {
//   console.log(k);
// }
// Expected: 1 2 3 4 5 (five lines). Actual: 0 1 2 3 4 5 (six lines).
//
// STEP 4: Write the fixed version here. Add a comment explaining the bug.


// ---------------------------------------------------------------
// PROGRAM 5 — do...while logic error
//
// let greeted = true;
// while (!greeted) {
//   console.log("Hello!");
//   greeted = true;
// }
// console.log("Program finished.");
// Wanted: "Hello!" must print at least once, no matter what greeted
// starts as. As written, if greeted starts true, the while never
// runs at all.
//
// STEP 5: Rewrite this as a do...while loop so "Hello!" is
//         guaranteed to print once. Add a comment explaining the bug.
