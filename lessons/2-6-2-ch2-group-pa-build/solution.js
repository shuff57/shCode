// Chapter 2 Group PA Part 2: Build It — Reference Solution (Locker Sweep)
// Problem: Locker Sweep
// Partners: Alex Chen, Jamie Rivera
// Date: 2026-09-28

// ========== PSEUDOCODE FROM CHART ==========
// START
// INPUT n, bankName
// CONST GOOD_DEAL_LIMIT = 1 // just a placeholder for the limit concept
// SET openCount = 0
// SET lastState = ""
// FOR i = 1 TO n
//     IF i % 3 === 0 THEN
//         CONTINUE
//     END IF
//     IF i % 2 === 1 THEN
//         openCount = openCount + 1
//         lastState = "open"
//     ELSE
//         lastState = "closed"
//     END IF
// END FOR
// IF n % 3 === 0 THEN
//     lastState = "never touched"
// END IF
// SWITCH lastState
// CASE "open":
//     PRINT "Locker " + n + " is open"
//     BREAK
// CASE "closed":
//     PRINT "Locker " + n + " is closed"
//     BREAK
// CASE "never touched":
//     PRINT "Locker " + n + " was skipped"
//     BREAK
// END SWITCH
// PRINT "Open lockers: " + openCount
// END

// ========== YOUR CODE BELOW ==========

// Problem: Locker Sweep
// Partners: Alex Chen, Jamie Rivera
// Date: 2026-09-28

const N = 20;
const BANK_NAME = "Main Hall";
const SKIP_MULTIPLE = 3;

try {
  if (N < 1) {
    throw new Error("n must be at least 1");
  }

  let openCount = 0;
  let lastState = "";

  for (let i = 1; i <= N; i++) {
    if (i % 3 === 0) {
      continue;   // the rule skips multiples of 3
    }
    // flip: odd lockers open, even closed
    if (i % 2 === 1) {
      openCount = openCount + 1;
      lastState = "open";
    } else {
      lastState = "closed";
    }
  }

  // classify one locker's final state with switch
  let targetLocker = 7;
  let targetState = "";
  if (targetLocker % 3 === 0) {
    targetState = "never touched";
  } else if (targetLocker % 2 === 1) {
    targetState = "open";
  } else {
    targetState = "closed";
  }

  switch (targetState) {
    case "open":
      console.log("Locker " + targetLocker + " is open");
      break;
    case "closed":
      console.log("Locker " + targetLocker + " is closed");
      break;
    default:
      console.log("Locker " + targetLocker + " was skipped");
  }

  console.log("Open lockers: " + openCount);

} catch (err) {
  console.log(err.message);
}