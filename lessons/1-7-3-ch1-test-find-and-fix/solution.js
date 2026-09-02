// Chapter 1 Test, Part 3 of 5: Find and Fix -- reference answer.
//
// Four bugs, one of each kind the course names, plus one repeat of the kind
// that is hardest to see.

const TAX_RATE = 0.08;

// syntax: the text had no closing quote, so nothing in the file ran at all.
let itemName = "Notebook";
let unitPrice = 4.25;
let count = 6;

let subtotal = unitPrice * count;

// logic: "5" is text. Adding text to a number joins them, so the order was
// costing 25.5 followed by a 5 rather than 30.5.
let shipping = 5;
let beforeTax = subtotal + shipping;

let tax = beforeTax * TAX_RATE;
// runtime: beforTax is a name that was never declared, so the program stopped
// here with a ReferenceError once the quote was fixed.
let total = beforeTax + tax;

// logic: count meant "how many were ordered" and was then reused to mean "how
// many are gift wrapped". One variable cannot mean two things, so the receipt
// reported an order of 2 notebooks.
let wrappedCount = 2;
let wrapFee = 1.5 * wrappedCount;

console.log("Item: " + itemName);
console.log("Ordered: " + count);
console.log("Subtotal: " + subtotal);
console.log("Before tax: " + beforeTax);
console.log("Gift wrap: " + wrapFee);
console.log("Total: " + total);
