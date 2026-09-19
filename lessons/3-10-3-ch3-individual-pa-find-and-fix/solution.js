// Chapter 3 Test, Part 3 of 5: Find and Fix.
//
// Reference solution. Each fix is marked with the bug kind it was.

const STORE_NAME = "Corner Counter";

// BUG 1 — syntax: the file was not valid JavaScript. Each object
// literal was missing the colon between the property name and its
// value, so nothing in the file ran. Fix: `price: 1.2`.
const PRICE_LIST = [
  { name: "Clip", price: 1.2 },
  { name: "Pad", price: 2.5 },
  { name: "Tape", price: 3.1 }
];

// BUG 2 — runtime: the file was valid and started, then stopped.
// PRICE_LIST.length is 3 and the last index is 2; indexing with length
// reads one past the end and throws "Cannot read properties of
// undefined". Fix: length - 1, or .at(-1) from 3.3.2.
const lastItem = PRICE_LIST[PRICE_LIST.length - 1];

// BUG 3 — logic: the program ran to the end and printed undefined for
// every line. The arrow has a block body, and a block body returns
// undefined unless it says return (3.4.8) -- the built string was
// thrown away and map collected nothing but undefineds. Fix: say
// return, or drop the braces.
const receiptLines = (list) => {
  return list.map((item) => {
    return item.name + " — $" + item.price;
  });
};

// BUG 4 — logic: the "backup" changed the item it was handed and then
// returned it, so there was no backup at all -- both names held the
// same object and the sale had already happened (3.6.3). The report
// printed $0.2 for both. Fix: build the copy with spread first
// (3.7.15), then change the copy.
function backupWithSale(item) {
  return { ...item, price: item.price - 1 };
}

const backup = backupWithSale(PRICE_LIST[0]);

console.log("Store: " + STORE_NAME);
console.log("Last item: " + lastItem.name);
console.log(receiptLines(PRICE_LIST));
console.log("Original: " + PRICE_LIST[0].name + " at $" + PRICE_LIST[0].price);
console.log("Backup: " + backup.name + " at $" + backup.price);