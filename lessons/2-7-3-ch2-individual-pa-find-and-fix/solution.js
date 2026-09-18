// Chapter 2 Individual PA, Part 3 of 5: Find and Fix.
// Reference answer -- all four bugs repaired, each with a // comment
// naming the kind it was.

// Bug 1 -- syntax: the name on the first item line is missing its
// closing quote, so the file is not valid JavaScript and nothing runs.
const TAX_RATE = 0.08;

let itemName = "Notebook";
let unitPrice = 4.25;
let count = 6;

let subtotal = unitPrice * count;

let shipping = 5;
let beforeTax = subtotal + shipping;

let tax = beforeTax * TAX_RATE;
let total = beforeTax + tax;

// Bug 2 -- runtime: the total line names an identifier that was never
// declared. It is a misspelling of the running total one line above,
// and the misspelled form does not exist anywhere else in the file.
// The fix is the spelling the declaration actually used.

// Bug 3 -- logic: the skip sits above the update, so week three's
// deposit never lands in the balance and the receipt reports 30
// instead of 40. The skip belongs below the update -- or, read the
// other way, the update belongs above the skip -- so week three is
// credited and only the holiday week is skipped.
const DEPOSIT = 10;
let savings = 0;
for (let w = 1; w <= 4; w++) {
  savings = savings + DEPOSIT;
  if (w === 3) {
    continue;
  }
}

// Bug 4 -- runtime: the update sits below a continue, so on the skipped
// rounds the counter never moves and the walk never reaches its stop.
let i = 0;
while (i < 5) {
  i++;
  if (i % 2 === 0) {
    continue;
  }
  console.log("Week " + i);
}

console.log("Item: " + itemName);
console.log("Ordered: " + count);
console.log("Before tax: " + beforeTax);
console.log("Savings: " + savings);
console.log("Total: " + total);

// Four fixes: syntax, runtime, logic, runtime.