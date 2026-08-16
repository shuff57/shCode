// 1.3.16 Split the Reused Variable

// One variable is doing four completely unrelated jobs below.
// Rewrite this so each job gets its own variable with a name
// that says what it is for.
//
// Use these four names:
//   maxScore     the highest score possible
//   playerName   who is playing
//   isGameOver   whether the game has ended
//   levelCount   how many levels there are
//
// The program should still print the same four lines, in order.
// When you are done, the word below should not appear at all.

let stuff = 100;
console.log(stuff);

stuff = "Alice";
console.log(stuff);

stuff = true;
console.log(stuff);

stuff = 8;
console.log(stuff);
