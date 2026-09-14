const order = {
  customer: { name: "Marisol" },
  items: [
    { name: "Pen", price: 1.5 },
    { name: "Notebook", price: 3 }
  ]
};

console.log(order.customer.name);

for (let i = 0; i < order.items.length; i++) {
  console.log(order.items[i].name + ": " + order.items[i].price);
}
