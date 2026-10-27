// Chapter 3 Group PA, Part 2 of 3: Build It.
// Problem: Library Cart
// Partners: Alex Chen, Jamie Rivera
// Date: 2026-11-02

// STEP 1: The seed data and the level.
const cartKey = "library-cart-cart";
const pageLimit = 300;

const cart = [
  { title: "Dune", copies: 2, pages: 412 },
  { title: "Emma", copies: 3, pages: 474 },
  { title: "Holes", copies: 5, pages: 233 },
  { title: "Matilda", copies: 2, pages: 240 }
];

// STEP 2: The contracts from 3.9.1.
// makeTitle(title, copies, pages) -> one title object
// totalPages(list)                -> a number
// longTitles(list, limit)         -> a NEW array of titles
// spineLines(list)                -> a NEW array of strings
// checkOut(list, title)           -> nothing (changes the list itself)
// saveCart(list) / loadCart()     -> nothing / the list (or the seed)

// STEP 3: The five functions, under the contracts they came from.

function makeTitle(title, copies, pages) {
  return { title: title, copies: copies, pages: pages };
}

function totalPages(list) {
  let total = 0;
  for (const title of list) {
    total = total + title.copies * title.pages;
  }
  return total;
}

function longTitles(list, limit) {
  const long = [];
  for (const title of list) {
    if (title.pages > limit) {
      long.push(title);
    }
  }
  return long;
}

const spineLines = (list) => {
  return list.map((title) => title.title + " x" + title.copies);
};

// checkOut changes the list it was handed. The caller holds the same
// array (3.6.2), so the change is already made when this returns --
// that is the side effect the PA asks for, and why this one returns
// nothing at all.
function checkOut(list, title) {
  for (const record of list) {
    if (record.title === title) {
      record.copies = Math.max(0, record.copies - 1);
    }
  }
}

function saveCart(list) {
  localStorage.setItem(cartKey, JSON.stringify(list));
}

function loadCart() {
  const text = localStorage.getItem(cartKey);
  if (text === null) {
    return cart.map(copyTitle);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    return cart.map(copyTitle);
  }
}

// Copies one record, so the seed list is never the list that gets
// checked out from. 3.7.15 is the spread pattern.
function copyTitle(title) {
  return { ...title };
}

// STEP 4: The main section -- calls in the order the plan says.
console.log("Total pages on the cart: " + totalPages(cart));
console.log("Long titles (over " + pageLimit + " pages):");
console.log(spineLines(longTitles(cart, pageLimit)).join("\n"));
console.log("Spines:");
console.log(spineLines(cart).join("\n"));

checkOut(cart, "Dune");
console.log("Checked out one Dune. New copies: " + cart[0].copies);

saveCart(cart);
const loaded = loadCart();
console.log("Reloaded from storage: " + loaded.length + " titles.");
console.log(typeof loaded[0].pages);
