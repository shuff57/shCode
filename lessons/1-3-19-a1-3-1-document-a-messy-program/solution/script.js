const TAX_RATE = 0.0725; // sales tax rate applied to the subtotal

const bookTitle = "The Hobbit"; // title of the book being ordered
const unitPrice = 8.99; // price per copy
const quantity = 4; // number of copies ordered

const subtotal = unitPrice * quantity; // price before tax is added
const orderTotal = subtotal + subtotal * TAX_RATE; // price after tax is added

console.log(bookTitle);
console.log(subtotal);
console.log(orderTotal);
