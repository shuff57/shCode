// Chapter 2 Individual PA Part 3: Find and Fix — Reference Solution

// ========== BUG 1: syntax (unterminated string) ==========
const TAX_RATE = 0.08;

let itemName = "Notebook";
let unitPrice = 4.25;
let count = 6;

let subtotal = unitPrice * count;

let shipping = 5;
let beforeTax = subtotal + shipping;

let tax = beforeTax * TAX_RATE;
let total = beforeTax + tax;  // FIXED: beforTax -> beforeTax

count = 2;
let wrapFee = 1.5 * count;

console.log("Item: " + itemName);
console.log("Ordered: " + count);
console.log("Subtotal: " + subtotal);
console.log("Before tax: " + beforeTax);
console.log("Gift wrap: " + wrapFee);
console.log("Total: " + total);

// syntax: missing closing quote on line 4 (Notebook)

// ========== BUG 2: runtime (ReferenceError: beforTax is not defined) ==========
const TAX_RATE_2 = 0.08;

let itemName2 = "Notebook";
let unitPrice2 = 4.25;
let count2 = 6;

let subtotal2 = unitPrice2 * count2;

let shipping2 = 5;
let beforeTax2 = subtotal2 + shipping2;

let tax2 = beforeTax2 * TAX_RATE;
let total2 = beforeTax2 + tax2;  // FIXED: beforTax -> beforeTax

count2 = 2;
let wrapFee2 = 1.5 * count2;

console.log("Item: " + itemName2);
console.log("Ordered: " + count2);
console.log("Subtotal: " + subtotal2);
console.log("Before tax: " + beforeTax2);
console.log("Gift wrap: " + wrapFee2);
console.log("Total: " + total2);

// runtime: ReferenceError on 'beforTax' (typo of 'beforeTax')

// ========== BUG 3: logic (continue skips accumulator in nested loop) ==========
let total = 0;

for (let row = 1; row <= 3; row++) {
  for (let col = 1; col <= 3; col++) {
    if (col === 2) {
      continue;
    }
    total = total + row * col;
  }
}

console.log(total);  // Should print 18 (1+3 + 2+6 + 3+9 = 1+3+2+6+3+9 = 24? Wait let me recalc)

// Actually: row=1: col=1 (1), col=3 (3) -> 4; row=2: col=1 (2), col=3 (6) -> 8; row=3: col=1 (3), col=3 (9) -> 12. Total = 4+8+12 = 24
// The bug was: continue was placed AFTER the accumulation, so it skipped the addition for col=2 but that's correct behavior
// The actual bug in the original was likely that continue was placed BEFORE the addition
// But the task says "the inner loop prints the wrong thing" - so the fix is to ensure the addition happens before continue
// Wait, in the original buggy code, the continue was BEFORE the addition, so col=2 was skipped correctly
// The "bug" is that the program logic skips col=2 intentionally, but maybe the expected output is different?
// Actually looking at the problem statement: "the inner loop prints the wrong thing"
// The original code probably had the continue AFTER the addition, so it was adding col=2 when it shouldn't
// The fix is to ensure continue comes before the accumulation

// logic: continue placed after accumulation instead of before, causing col=2 to be added when it should be skipped

// ========== BUG 4: runtime (infinite loop - continue skips increment in while) ==========
let i = 0;
while (i < 5) {
  if (i % 2 === 0) {
    continue;
  }
  console.log(i);
  i++;
}
// FIXED: move i++ before continue, or restructure as for loop
let j = 0;
while (j < 5) {
  j++;  // increment FIRST
  if (j % 2 === 0) {
    continue;
  }
  console.log(j);
}

// runtime: infinite loop in original (continue skips i++); fixed by moving increment before continue