// 2.4.31 Fix the Duplicate Pairs
//
// This loop is supposed to print each pair once, like 1-2, 1-3, 2-3.
// Instead it prints every pair twice, plus pairs like 1-1.
//
// STEP 1: Run it first and see the problem.

for (let a = 1; a <= 3; a++) {
  for (let b = 1; b <= 3; b++) {
    console.log(a + "-" + b);
  }
}

// STEP 2: Fix the inner loop above so b starts at a + 1 instead of 1.
