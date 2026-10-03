// Chapter 3 Test, Part 3 of 5: Find and Fix.
//
// Reference solution. Each fix is marked with the bug kind it was.

const storeName = "Corner Counter";

// BUG 1 — syntax: the file was not valid JavaScript. Each object
// literal was missing the colon between the property name and its
// value, so nothing in the file ran. Fix: `price: 1.2`.
const priceList = [
  { name: "Clip", price: 1.2 },
  { name: "Pad", price: 2.5 },
  { name: "Tape", price: 3.1 }
];

// BUG 2 — runtime: the file was valid and started, then stopped.
// priceList.length is 3 and the last index is 2; indexing with length
// reads one past the end and gives undefined (no error yet). The crash
// comes one line later, at lastItem.name: "Cannot read properties of
// undefined (reading 'name')". Fix: length - 1.
const lastItem = priceList[priceList.length - 1];

// BUG 3 — logic: the program ran to the end and printed one undefined
// where the three receipt lines should be. Two returns are missing. The
// outer arrow has a block body and never returns the mapped array (3.2.11),
// so receiptLines(...) is undefined. The inner arrow also has a block body
// that never says return (3.4.8), so the built string is thrown away and
// map would have collected only undefineds. Fix: say return in both places,
// or drop the braces on the inner one.
const receiptLines = (list) => {
  return list.map((item) => {
    return item.name + " — $" + item.price;
  });
};

// BUG 4 — logic: the "backup" changed the item it was handed and then
// returned it, so there was no backup at all -- both names held the
// same object and the sale had already happened (3.6.3). The report
// printed $0.19999999999999996 for both (1.2 - 1 is not exactly 0.2 in
// floating point; that long decimal is expected, not a bug to fix). Fix: build the copy with spread first
// (3.7.15), then change the copy.
function backupWithSale(item) {
  return { ...item, price: item.price - 1 };
}

const backup = backupWithSale(priceList[0]);

console.log("Store: " + storeName);
console.log("Last item: " + lastItem.name);
console.log(receiptLines(priceList));
console.log("Original: " + priceList[0].name + " at $" + priceList[0].price);
console.log("Backup: " + backup.name + " at $" + backup.price);