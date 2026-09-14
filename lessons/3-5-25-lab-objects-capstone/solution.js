const cart = [
  {
    name: "Pen",
    price: 1.5,
    quantity: 10,
    details: { color: "blue" }
  },
  {
    name: "Notebook",
    price: 3,
    quantity: 4,
    "item code": "NB-04"
  },
  {
    name: "Eraser",
    price: 0.75,
    quantity: 6,
    details: { color: "white" }
  }
];

console.log(cart[0].name);
console.log(cart[1]["item code"]);
console.log(cart[0].details.color);

for (let i = 0; i < cart.length; i++) {
  console.log(cart[i].name + ": " + cart[i].price * cart[i].quantity);
}

const { name, price } = cart[0];
console.log(name + " costs " + price);

for (const key of Object.keys(cart[0])) {
  console.log(key + ": " + cart[0][key]);
}
