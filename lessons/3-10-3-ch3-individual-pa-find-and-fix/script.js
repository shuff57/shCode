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

const storeName = "Corner Counter";

// Bug 1: the price list.
const priceList = [
  { name: "Clip", price 1.2 },
  { name: "Pad", price 2.5 },
  { name: "Tape", price 3.1 }
];

// Bug 2: the last item.
const lastItem = priceList[priceList.length];

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

const backup = backupWithSale(priceList[0]);

console.log("Store: " + storeName);
console.log("Last item: " + lastItem.name);
console.log(receiptLines(priceList));
console.log("Original: " + priceList[0].name + " at $" + priceList[0].price);
console.log("Backup: " + backup.name + " at $" + backup.price);