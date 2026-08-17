// 2.5.26 A2.5.1 -- Loop with try/catch
//
// Three sensor readings arrived as text. One converts cleanly, one is
// not a number at all, and one converts but breaks this program's own
// rule (readings must be positive). Process all three without letting
// a bad one crash the whole loop.

// STEP 1: Write a for loop with i from 1 to 3.
//         Inside, set a variable raw to "12" when i is 1,
//         "abc" when i is 2, and "-4" when i is 3
//         (three separate if statements).

// STEP 2: Inside a try block, convert raw to a number with Number(raw).
//         If the result is NaN, throw new Error naming the bad value.
//         If it is 0 or less, throw new Error saying it must be
//         positive. Otherwise log the reading number and its value.

// STEP 3: In the catch block, log a friendly message using err.message
//         that names which reading was skipped. Do not just log
//         "Error!" -- say what actually went wrong.
