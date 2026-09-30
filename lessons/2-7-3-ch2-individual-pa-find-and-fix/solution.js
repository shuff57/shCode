// Chapter 2 Individual PA, Part 3 of 5: Find and Fix.
// Reference answer -- all four bugs repaired, each with a // comment
// naming the kind it was.

// Bug 1 -- syntax: the string on the item line is missing its closing
// quote, so the file is not valid JavaScript and not one line runs.
const taxRate = 0.08;

let itemName = "Notebook";
let unitPrice = 4.25;
let count = 6;

let subtotal = unitPrice * count;

let shipping = 5;
let beforeTax = subtotal + shipping;

let tax = beforeTax * taxRate;

// Bug 2 -- runtime: the total line names an identifier that was never
// declared. It is a misspelling of the running total one line above,
// and the misspelled form exists nowhere else in the file. The fix is
// the spelling the declaration actually used.
let total = beforeTax + tax;

// Bug 3 -- logic: continue jumps straight to the next round, so
// anything written after it is skipped on the rounds that take it.
// Week 3 takes it, so that week's deposit never lands and the receipt
// says Savings: 30 instead of 40. The deposit has to happen every
// week, so it moves above the skip -- the log line is what the skip is
// for.
const DEPOSIT = 10;
let savings = 0;
for (let w = 1; w <= 4; w++) {
  savings = savings + DEPOSIT;
  if (w === 3) {
    continue;
  }
  console.log("Week " + w + ": deposit of " + DEPOSIT);
}

console.log("Item: " + itemName);
console.log("Ordered: " + count);
console.log("Before tax: " + beforeTax);
console.log("Savings: " + savings);
console.log("Total: " + total);

// Bug 4 -- runtime: the line that moves the counter sits below a
// continue, so on the rounds the skip takes, the counter never moves.
// The loop asks the same question forever and never reaches its stop.
let i = 0;
while (i < 5) {
  i++;
  if (i % 2 === 0) {
    continue;
  }
  console.log("Week " + i);
}

// Four fixes: syntax, runtime, logic, runtime.
