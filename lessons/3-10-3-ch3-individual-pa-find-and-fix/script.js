// Chapter 3 Test, Part 3 of 5: Find and Fix.
//
// This file has four bugs in it. One stops the program before it
// starts, one stops it part way through, one lets it run and prints
// something untrue, and one changes data it was never supposed to
// touch.
//
// Fix all four. Above each fix, write a comment naming what kind of
// bug it was -- the three kinds are on the instructions beside this
// editor.

const STORE_NAME = "Corner Counter";

// Bug 1: the price list.
const PRICE_LIST = [
  { name: "Clip", price 1.2 },
  { name: "Pad", price 2.5 },
  { name: "Tape", price 3.1 }
];

// Bug 2: the last item.
const lastItem = PRICE_LIST[PRICE_LIST.length];

// Bug 3: the receipt lines.
const receiptLines = (list) => {
  list.map((item) => {
    item.name + " — $" + item.price;
  });
};

// Bug 4: a backup that changes itself.
function backupWithSale(item) {
  item.price = item.price - 1;
  return item;
}

const backup = backupWithSale(PRICE_LIST[0]);

console.log("Store: " + STORE_NAME);
console.log("Last item: " + lastItem.name);
console.log(receiptLines(PRICE_LIST));
console.log("Original: " + PRICE_LIST[0].name + " at $" + PRICE_LIST[0].price);
console.log("Backup: " + backup.name + " at $" + backup.price);