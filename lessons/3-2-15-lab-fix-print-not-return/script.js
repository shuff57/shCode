// 3.2.15 Fix a Function That Prints Instead of Returning

// This is meant to give the caller a usable number, but something is wrong.
// Run it first and read the output carefully.

function area(width, height) {
  console.log(width * height);
}

const a = area(5, 8);
console.log("One room: " + a);
console.log("Two rooms: " + (a * 2));

// STEP 1: Run it. Notice the area prints, but "a" is undefined.

// STEP 2: Find the line where the function shows its answer.
//         A function with no return hands nothing back.

// STEP 3: Change the function to hand its answer back with return,
//         and let the caller do the printing.

// STEP 4: Use the returned value in an expression (for example double it)
//         and log the result. Working arithmetic proves a number came back.
