// 3.6.8 Lab: Fix a Function That Reassigns Instead of Mutating
//
// addOne is supposed to add 1 to every score in the caller's array.
// It does not. Run it and watch the caller's array come back unchanged.

function addOne(scores) {
  scores = [scores[0] + 1, scores[1] + 1, scores[2] + 1];
}

let quizScores = [10, 20, 30];
addOne(quizScores);
console.log(quizScores);

// STEP 1: Run it. The array prints [10,20,30]: the update never reached it.

// STEP 2: Look at the function body. It builds a brand-new array and points
//         the local parameter at it. That reassignment dies when the call ends.

// STEP 3: Rewrite the body so it writes each new value INTO the array the
//         parameter already points at: use a for loop and assign to the
//         element by index (the same style as addOne's intended job).
//         Do NOT point the parameter at a new array. Run it again and confirm
//         the caller's array is now updated.
