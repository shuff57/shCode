// Counts how many multiples of 3 appear between 1 and 20
let multipleCount = 0;
for (let i = 1; i <= 20; i++) {
  if (i % 3 === 0) {
    multipleCount = multipleCount + 1;
    console.log(i + " is a multiple of 3");
  }
}
console.log("Multiples of 3 found: " + multipleCount);

// Builds up a running total of the numbers 1 through 10
let total = 0;
let n = 1;
while (n <= 10) {
  total = total + n;
  n = n + 1;
}
console.log("Total: " + total);
