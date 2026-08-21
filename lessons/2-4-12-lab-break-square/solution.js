// 2.4.12 Break When the Square Passes 50
//
// STEP 1: Set up the counter.
let n = 1;

// STEP 2: Loop until the square passes 50, then break out.
while (true) {
  if (n * n > 50) {
    console.log(n);
    console.log(n * n);
    break;
  }
  n++;
}
