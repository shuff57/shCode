// 1.5.43 Debug the Order Total

// This runs without a single error message and gets the wrong
// answer three separate ways.
//
// The order: 3 notebooks at 4.00 each, 10% off, then 8% tax.

const DISCOUNT_RATE = 0.10;
const TAX_RATE = 0.08;

let unitPrice = 4.00;
let quantity = 3;

let subtotal = unitPrice + quantity;
let discount = subtotal * DISCOUNT_RATE;
let discounted = subtotal + discount;
let tax = discounted * TAX_RATE;
let total = discounted - tax;

console.log(total);

// STEP 1: work out by hand what this SHOULD print, and write
//         that number in a comment here as your expected value.
//         Do this before you change any code.

// STEP 2: add labelled prints for subtotal, discounted and tax,
//         so you can see which value first stops matching what
//         you expected. A bare number tells you nothing.

// STEP 3: fix all three bugs.

// STEP 4: add an if/else comparing the final total to your
//         expected value, printing PASS or FAIL.
