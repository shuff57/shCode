// 3.1.10 Refactor the Receipt Header
//
// This program prints a library-checkout header three times, once before
// each book. Rewrite it so the header lives in one function, called three
// times -- the output should not change at all.

console.log("=== LIBRARY CHECKOUT ===");
console.log("Book: The Hobbit");

console.log("=== LIBRARY CHECKOUT ===");
console.log("Book: Dune");

console.log("=== LIBRARY CHECKOUT ===");
console.log("Book: Kindred");

// STEP 1: Above, find the line that repeats three times.

// STEP 2: Define a parameterless function called printHeader that logs
//         that line, once, inside the function body.

// STEP 3: Replace each repeated header log with a call to printHeader(),
//         keeping the three book lines exactly where they were.
