// Chapter 2 Individual PA, Part 3 of 5: Find and Fix.
//
// Four bugs are hiding in this file. Fix all four, and above each fix
// write a comment naming what kind of bug it was. The three kinds are
// spelled out in the instructions beside this editor -- do not copy
// them from here: writing them yourself is how you show you can
// name the bug.
//
// Press Run after every single fix.
//
// When all four are fixed, this program prints exactly this and then
// stops:
//
//   Week 1: deposit of 10
//   Week 2: deposit of 10
//   Week 4: deposit of 10
//   Item: Notebook
//   Ordered: 6
//   Before tax: 30.5
//   Savings: 40
//   Total: 32.94
//   Week 1
//   Week 3
//   Week 5

const taxRate = 0.08;

// Bug 1. The item being ordered is Notebook.
let itemName = "Notebook;
let unitPrice = 4.25;
let count = 6;

let subtotal = unitPrice * count;

let shipping = 5;
let beforeTax = subtotal + shipping;

let tax = beforeTax * taxRate;

// Bug 2. The total is the amount before tax plus the tax.
let total = beforTax + tax;

// Bug 3. Ten goes into savings every week, week 3 included. Week 3
// is a holiday, so only its log line is skipped.
const DEPOSIT = 10;
let savings = 0;
for (let w = 1; w <= 4; w++) {
  if (w === 3) {
    continue;
  }
  savings = savings + DEPOSIT;
  console.log("Week " + w + ": deposit of " + DEPOSIT);
}

console.log("Item: " + itemName);
console.log("Ordered: " + count);
console.log("Before tax: " + beforeTax);
console.log("Savings: " + savings);
console.log("Total: " + total);

// Bug 4. The walking log prints weeks 1 to 5, odd weeks only.
let i = 0;
while (i < 5) {
  if (i % 2 === 0) {
    continue;
  }
  console.log("Week " + i);
  i++;
}
