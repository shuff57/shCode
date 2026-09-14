const item = { title: "Pen", cost: 2, quantity: 10 };

const { title, cost, quantity } = item;

console.log(title + " costs " + cost + " each, " + quantity + " in stock");

function describe({ title, quantity }) {
  return title + " x" + quantity;
}

console.log(describe({ title: "Pen", quantity: 10 }));
