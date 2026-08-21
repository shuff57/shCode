// 2.4.4 Write Both: Known Count, Unknown Count
//
// STEP 1: A known count — use for.
for (let i = 1; i <= 8; i++) {
  console.log(i);
}

// STEP 2: An unknown count — use while.
let total = 1;
while (total <= 100) {
  total = total * 2;
}
console.log(total);
