// 2.4.8 do...while: Count 1 to 5
//
// STEP 1: Log the numbers 1 through 5 with a do...while loop.
let counter = 1;
do {
  console.log(counter);
  counter++;
} while (counter <= 5);

// STEP 2: A do...while whose condition starts false still runs once.
let secondCounter = 10;
do {
  console.log("Runs once even though 10 < 0 is false");
  secondCounter++;
} while (secondCounter < 0);
