// Chapter 1 Test, Part 3 of 5: Find and Fix.
//
// This program prints a receipt for a book order. It has four bugs in it.
// One of them stops the program from running at all, one of them stops it
// part way through, and two of them let it run happily and print something
// that is not true.
//
// Fix all four. Above each fix, write a comment naming what kind of bug it
// was -- the three kinds are on the instructions beside this editor.

const TAX_RATE = 0.08;

let itemName = "Notebook;
let unitPrice = 4.25;
let count = 6;

let subtotal = unitPrice * count;

let shipping = "5";
let beforeTax = subtotal + shipping;

let tax = beforeTax * TAX_RATE;
let total = beforTax + tax;

count = 2;
let wrapFee = 1.5 * count;

console.log("Item: " + itemName);
console.log("Ordered: " + count);
console.log("Subtotal: " + subtotal);
console.log("Before tax: " + beforeTax);
console.log("Gift wrap: " + wrapFee);
console.log("Total: " + total);
