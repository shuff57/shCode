// Chapter 3 Group PA, Part 2 of 3: Build It.
// Problem: Snack Shack
// Partners: Alex Chen, Jamie Rivera
// Date: 2026-11-02

// STEP 1: The seed data and the level.
const stockKey = "snack-shack-stock";
const reorderLevel = 5;

const stock = [
  { name: "Popcorn", price: 3.5, qty: 12 },
  { name: "Pretzel", price: 4, qty: 3 },
  { name: "Soda", price: 2.25, qty: 20 },
  { name: "Nachos", price: 5, qty: 2 }
];

// STEP 2: The contracts from 3.9.1.
// makeItem(name, price, qty)          -> one item object
// totalValue(list)                    -> a number
// lowStock(list, level)               -> a NEW array of items
// receiptLines(list)                  -> a NEW array of strings
// sellItem(list, name)                -> nothing (changes the list itself)
// saveStock(list) / loadStock()       -> nothing / the list (or the seed)

// STEP 3: The five functions, under the contracts they came from.

function makeItem(name, price, qty) {
  return { name: name, price: price, qty: qty };
}

function totalValue(list) {
  let total = 0;
  for (const item of list) {
    total = total + item.price * item.qty;
  }
  return total;
}

function lowStock(list, level) {
  const short = [];
  for (const item of list) {
    if (item.qty < level) {
      short.push(item);
    }
  }
  return short;
}

const receiptLines = (list) => {
  return list.map((item) => item.name + " x" + item.qty);
};

// sellItem changes the list it was handed. The caller holds the same
// array (3.6.2), so the change is already made when this returns --
// that is the side effect the PA asks for, and why this one returns
// nothing at all.
function sellItem(list, name) {
  for (const item of list) {
    if (item.name === name) {
      item.qty = Math.max(0, item.qty - 1);
    }
  }
}

function saveStock(list) {
  localStorage.setItem(stockKey, JSON.stringify(list));
}

function loadStock() {
  const text = localStorage.getItem(stockKey);
  if (text === null) {
    return stock.map(copyItem);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    return stock.map(copyItem);
  }
}

// Copies one record, so the seed list is never the list that gets sold
// from. 3.7.15 is the spread pattern.
function copyItem(item) {
  return { ...item };
}

// STEP 4: The main section -- calls in the order the chart says.
console.log("Total inventory value: $" + totalValue(stock).toFixed(2));
console.log("Low stock (under " + reorderLevel + "):");
console.log(receiptLines(lowStock(stock, reorderLevel)).join("\n"));
console.log("Receipt:");
console.log(receiptLines(stock).join("\n"));

sellItem(stock, "Popcorn");
console.log("Sold one Popcorn. New qty: " + stock[0].qty);

saveStock(stock);
const loaded = loadStock();
console.log("Reloaded from storage: " + loaded.length + " items.");
console.log(typeof loaded[0].price);