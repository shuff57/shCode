// Chapter 2 Group PA, Part 2 of 3: Build It.
// Problem: Locker Sweep
// Partners: Alex Chen, Jamie Rivera
// Date: 2026-09-28

// STEP 1: Inputs and limit.
const N = 20;
const bankName = "North Bank";
const skipMultiple = 3;
const reportLocker = 7;

// STEP 2: The chart from 2.6.1, as comments.
// START
// INPUT n and bankName
// FOR i = 1 TO n
//   IF i is a multiple of 3 THEN CONTINUE
//   FLIP locker i (odd opens, even closes)
// END FOR
// WORK OUT locker 7's final state
// CLASSIFY open / closed / never touched
// REPORT the classification and the open count
// END

// STEP 3: The program under the chart it came from.
// The guard: the count can be bad (zero, negative, or not a number at all),
// so it is checked before the loop and thrown on.
try {
  if (typeof N !== "number" || N < 1) {
    throw new Error("n must be a number that is at least 1");
  }

  let openCount = 0;
let locker7State = "never touched";

for (let i = 1; i <= N; i++) {
  if (i % skipMultiple === 0) {
    continue;
  }
  if (i === reportLocker) {
    if (i % 2 === 1) {
      locker7State = "open";
    } else {
      locker7State = "closed";
    }
  }
  if (i % 2 === 1) {
    openCount = openCount + 1;
  }
}

switch (locker7State) {
  case "open":
    console.log(`Locker ${reportLocker} at ${bankName} is open.`);
    break;
  case "closed":
    console.log(`Locker ${reportLocker} at ${bankName} is closed.`);
    break;
  case "never touched":
    console.log(`Locker ${reportLocker} at ${bankName} was never touched.`);
    break;
  default:
    console.log("Unknown state");
}

console.log("Open lockers: " + openCount);
  console.log(typeof locker7State);
} catch (err) {
  console.log(err.message);
}

// Early-finisher extension: run the sweep with N = 0 -- the loop never
// enters, the report still prints, and locker 7 was never touched.
