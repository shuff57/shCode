// 3.5.24 Parallel Arrays vs an Array of Records

// STEP 1: Read the starter below. Each field lives in its own array, and the
//         three arrays only line up because they are the same length and in
//         the same order. There is nothing in the program that says row 1 of
//         names goes with row 1 of scores.

const names = ["Marisol", "Dev", "Priya"];
const scores = [92, 78, 85];
const groups = ["A", "B", "A"];

for (let i = 0; i < names.length; i++) {
  console.log(names[i] + " (" + groups[i] + "): " + scores[i]);
}

// STEP 2: Replace the three parallel arrays with ONE array whose elements
//         are objects. Each object holds name, score and group for one player.

// STEP 3: Loop over the new array and print each player's fields by picking
//         the record with its index, then reading each field off that record
//         with a dot.
