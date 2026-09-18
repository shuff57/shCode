// Chapter 2 Test, Part 3 of 5: Find and Fix.
//
// This file has four bugs in it. One stops the program before it
// starts, one stops it part way through, one lets it run and prints
// something untrue, and one never finishes at all.
//
// Fix all four. Above each fix, write a comment naming what kind of
// bug it was -- the three kinds are on the instructions beside this
// editor.

const TAX_RATE = 0.08;

let itemName = "Notebook;
let unitPrice = 4.25;
let count = 6;

let subtotal = unitPrice * count;

let shipping = 5;
let beforeTax = subtotal + shipping;

let tax = beforeTax * TAX_RATE;
let total = beforTax + tax;

// Bug 3: savings -- ten a week for four weeks, but week three is a
// holiday week you are meant to skip. The receipt prints 30 either
// way; work out what it should print.
const DEPOSIT = 10;
let savings = 0;
for (let w = 1; w <= 4; w++) {
  if (w === 3) {
    continue;
  }
  savings = savings + DEPOSIT;
}

// Bug 4: the walking log, weeks 1 to 5, odd weeks only.
let i = 0;
while (i < 5) {
  if (i % 2 === 0) {
    continue;
  }
  console.log("Week " + i);
  i++;
}

console.log("Item: " + itemName);
console.log("Ordered: " + count);
console.log("Before tax: " + beforeTax);
console.log("Savings: " + savings);
console.log("Total: " + total);
