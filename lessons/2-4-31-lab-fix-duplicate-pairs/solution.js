// 2.4.31 Fix the Duplicate Pairs
//
// Fix the inner loop so b starts at a + 1 instead of 1.
// Each pair (1-2, 1-3, 2-3) prints exactly once.

for (let a = 1; a <= 3; a++) {
  for (let b = a + 1; b <= 3; b++) {
    console.log(a + "-" + b);
  }
}
