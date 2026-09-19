// 1.5.43 Debug the Order Total

// The order: 3 notebooks at 4.00 each, 10% off, then 8% tax.
// STEP 1: expected total = 12.00 - 1.20 = 10.80, plus 8% tax (0.864) = 11.664 -> 11.66

const discountRate = 0.10;
const taxRate = 0.08;

let unitPrice = 4.00;
let quantity = 3;

let subtotal = unitPrice * quantity;
console.log("subtotal: " + subtotal);

let discount = subtotal * discountRate;
let discounted = subtotal - discount;
console.log("discounted: " + discounted);

let tax = discounted * taxRate;
console.log("tax: " + tax);

let total = discounted + tax;
console.log(total);

if (total.toFixed(2) === "11.66") {
  console.log("PASS");
} else {
  console.log("FAIL - got " + total);
}
