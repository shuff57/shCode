// 3.6.16 Lab: Pass-by-Reference Capstone Practice
//
// Three functions, each making a different choice about the caller's data:
// one returns a new array, one mutates an object on purpose, one deep-copies.
// After each call, log the caller's data to prove which choice you made.

// STEP 1: Define addScore(scores, score). It returns a NEW array of the old
//         scores plus the new one. Build it with spread, so the array the
//         caller passed in is not changed.

// STEP 2: Define recordPlay(song). It adds 1 to the object's plays property.
//         This one is MEANT to change the caller's object: a play count is
//         shared state. Do not copy here.

// STEP 3: Define copyBook(library). It returns a deep copy of an object that
//         holds a nested array, using structuredClone. Changing the copy must
//         leave the caller's library untouched.

// STEP 4: Call all three. Log each caller's data before and after, and check:
//         - addScore left the original array alone
//         - recordPlay changed the song object the caller sees
//         - copyBook's changes stayed in the copy
